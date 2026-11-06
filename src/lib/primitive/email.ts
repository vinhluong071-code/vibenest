import "server-only";

const API_BASE = "https://api.primitive.dev/v1";

type PrimitiveErrorBody = {
  code?: string;
  message?: string;
  request_id?: string;
};

type PrimitiveEnvelope<T> = {
  success?: boolean;
  data?: T;
  meta?: unknown;
  error?: PrimitiveErrorBody;
};

export class PrimitiveApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(status: number, error?: PrimitiveErrorBody) {
    super(error?.message ?? `Primitive request failed (${status}).`);
    this.name = "PrimitiveApiError";
    this.status = status;
    this.code = error?.code ?? "primitive_upstream_error";
    this.requestId = error?.request_id;
  }
}

function credentials() {
  const apiKey = process.env.PRIMITIVE_API_KEY;
  if (!apiKey) throw new Error("PRIMITIVE_API_KEY is not configured.");
  return {
    apiKey,
    from: process.env.PRIMITIVE_FROM_EMAIL || undefined,
    domainId: process.env.PRIMITIVE_DOMAIN_ID || undefined,
  };
}

async function primitiveRequest<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 12_000,
): Promise<T> {
  const { apiKey } = credentials();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });

  const payload = await response.json().catch(() => ({})) as PrimitiveEnvelope<T>;
  if (!response.ok || payload.success === false) {
    throw new PrimitiveApiError(response.status, payload.error);
  }
  return (payload.data ?? payload) as T;
}

export type PrimitiveSendInput = {
  to: string | string[];
  subject: string;
  body_text?: string;
  body_html?: string;
  from?: string;
  reply_to?: string | string[];
  idempotency_key: string;
};

export async function sendEmail(input: PrimitiveSendInput) {
  const { from } = credentials();
  const { idempotency_key, ...message } = input;
  if (!idempotency_key || idempotency_key.length > 255) {
    throw new Error("A valid Primitive idempotency key is required.");
  }
  return primitiveRequest<Record<string, unknown>>("/send-mail", {
    method: "POST",
    headers: { "Idempotency-Key": idempotency_key },
    body: JSON.stringify({
      ...(message.from || from ? { from: message.from || from } : {}),
      ...message,
    }),
  }, 20_000);
}

export async function replyToEmail(
  emailId: string,
  input: { body_text?: string; body_html?: string; from?: string; idempotency_key?: string },
) {
  const { from } = credentials();
  if (!emailId || emailId.length > 255 || /[/?#]/.test(emailId)) {
    throw new Error("Invalid Primitive inbound email id.");
  }
  const { idempotency_key, ...message } = input;
  return primitiveRequest<Record<string, unknown>>(
    `/emails/${encodeURIComponent(emailId)}/reply`,
    {
      method: "POST",
      ...(idempotency_key ? { headers: { "Idempotency-Key": idempotency_key } } : {}),
      body: JSON.stringify({
        ...(message.from || from ? { from: message.from || from } : {}),
        ...message,
      }),
    },
    20_000,
  );
}

export type PrimitiveEmailStatus = "pending" | "accepted" | "completed" | "rejected";

export async function listEmails(options: {
  limit?: number;
  cursor?: string;
  domainId?: string;
  status?: PrimitiveEmailStatus;
  search?: string;
} = {}) {
  const { domainId } = credentials();
  const query = new URLSearchParams();
  query.set("limit", String(Math.min(100, Math.max(1, Math.floor(options.limit ?? 25)))));
  const cursor = options.cursor?.slice(0, 2048);
  if (cursor) query.set("cursor", cursor);
  const selectedDomain = options.domainId || domainId;
  if (selectedDomain) query.set("domain_id", selectedDomain);
  if (options.status) query.set("status", options.status);
  if (options.search) query.set("search", options.search.slice(0, 500));
  return primitiveRequest<{ emails: unknown[]; cursor: string | null; total?: number }>(
    `/emails?${query.toString()}`,
  );
}

export async function getInboxStatus() {
  return primitiveRequest<{
    ready: boolean;
    receiving_ready: boolean;
    processing_ready: boolean;
    summary: string;
    next_actions: Array<{ kind: string; message: string; command?: string }>;
    domains: Array<Record<string, unknown>>;
    endpoints: { total: number; enabled: number; disabled: number };
    functions: { total: number; deployed: number; pending: number; failed: number };
    recent_emails: { total: number; latest_received_at: string | null };
  }>("/inbox/status");
}
