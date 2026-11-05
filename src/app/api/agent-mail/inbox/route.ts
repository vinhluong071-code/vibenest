import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const expected = process.env.VIBENEST_AGENT_API_SECRET ?? "";
  const supplied = request.headers.get("x-vibenest-agent-secret") ?? "";
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

function primitiveError(payload: {
  error?: { code?: string; request_id?: string };
}) {
  return {
    error: "primitive_request_failed",
    code: payload.error?.code ?? "upstream_error",
    requestId: payload.error?.request_id,
  };
}

/** Private VibeNest agent bridge. Primitive credentials are server-only. */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const apiKey = process.env.PRIMITIVE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "primitive_not_configured" }, { status: 503 });

  const incoming = new URL(request.url);
  const limitValue = Number(incoming.searchParams.get("limit") ?? "25");
  const limit = Number.isFinite(limitValue) ? Math.min(50, Math.max(1, Math.floor(limitValue))) : 25;
  const upstream = new URL("https://api.primitive.dev/v1/emails");
  upstream.searchParams.set("limit", String(limit));
  const cursor = incoming.searchParams.get("cursor");
  if (cursor && cursor.length <= 2048) upstream.searchParams.set("cursor", cursor);
  const domainId = process.env.PRIMITIVE_DOMAIN_ID;
  if (domainId) upstream.searchParams.set("domain_id", domainId);
  const status = incoming.searchParams.get("status");
  if (status && ["pending", "accepted", "completed", "rejected"].includes(status)) upstream.searchParams.set("status", status);

  try {
    const response = await fetch(upstream, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const payload = await response.json() as {
      success?: boolean;
      data?: unknown;
      meta?: unknown;
      error?: { code?: string; message?: string; request_id?: string };
    };
    if (!response.ok || payload.success === false) {
      return NextResponse.json(primitiveError(payload), { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ data: payload.data ?? [], meta: payload.meta ?? null }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ error: "primitive_unavailable" }, { status: 502 });
  }
}

/** Send agent mail through Primitive; caller must provide an idempotency key. */
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const apiKey = process.env.PRIMITIVE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "primitive_not_configured" }, { status: 503 });

  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!idempotencyKey || idempotencyKey.length > 255) {
    return NextResponse.json({ error: "idempotency_key_required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const input = body as { to?: unknown; subject?: unknown; body_text?: unknown; body_html?: unknown; reply_to?: unknown };
  const recipients = typeof input.to === "string" ? [input.to] : input.to;
  const subject = typeof input.subject === "string" ? input.subject.trim() : "";
  const bodyText = typeof input.body_text === "string" ? input.body_text : undefined;
  const bodyHtml = typeof input.body_html === "string" ? input.body_html : undefined;

  if (!Array.isArray(recipients) || recipients.length < 1 || recipients.length > 20 ||
      recipients.some((value) => typeof value !== "string" || value.length > 998 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) ||
      !subject || subject.length > 998 ||
      (!bodyText && !bodyHtml) || (bodyText && bodyText.length > 50000) || (bodyHtml && bodyHtml.length > 100000)) {
    return NextResponse.json({ error: "invalid_mail_fields" }, { status: 400 });
  }

  const replyTo = typeof input.reply_to === "string" && input.reply_to.length <= 998 ? input.reply_to : undefined;
  try {
    const response = await fetch("https://api.primitive.dev/v1/send-mail", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        to: recipients,
        subject,
        ...(bodyText ? { body_text: bodyText } : {}),
        ...(bodyHtml ? { body_html: bodyHtml } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json() as {
      success?: boolean;
      data?: unknown;
      error?: { code?: string; request_id?: string };
    };
    if (!response.ok || payload.success === false) {
      return NextResponse.json(primitiveError(payload), { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ data: payload.data ?? null }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ error: "primitive_unavailable" }, { status: 502 });
  }
}
