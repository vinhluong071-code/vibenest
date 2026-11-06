import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { listEmails, sendEmail, type PrimitiveEmailStatus } from "@/lib/primitive/email";

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

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const incoming = new URL(request.url);
  const limitValue = Number(incoming.searchParams.get("limit") ?? "25");
  const limit = Number.isFinite(limitValue) ? Math.min(50, Math.max(1, Math.floor(limitValue))) : 25;
  const cursor = incoming.searchParams.get("cursor") ?? undefined;
  const rawStatus = incoming.searchParams.get("status");
  const status = rawStatus && ["pending", "accepted", "completed", "rejected"].includes(rawStatus)
    ? rawStatus as PrimitiveEmailStatus : undefined;

  try {
    const data = await listEmails({ limit, cursor, status });
    return NextResponse.json({ data }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ error: "primitive_inbox_unavailable" }, { status: 502 });
  }
}

/** Send an agent email. All outbound sends require an explicit idempotency key. */
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!idempotencyKey || idempotencyKey.length > 255) {
    return NextResponse.json({ error: "idempotency_key_required" }, { status: 400 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
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
  const replyTo = typeof input.reply_to === "string" ? input.reply_to.trim() : undefined;
  const validEmail = (value: unknown): value is string =>
    typeof value === "string" && value.length <= 998 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  if (!Array.isArray(recipients) || recipients.length < 1 || recipients.length > 20 ||
      recipients.some((value) => !validEmail(value)) ||
      !subject || subject.length > 998 ||
      (!bodyText && !bodyHtml) || (bodyText && bodyText.length > 50000) ||
      (bodyHtml && bodyHtml.length > 100000) ||
      (replyTo !== undefined && !validEmail(replyTo))) {
    return NextResponse.json({ error: "invalid_mail_fields" }, { status: 400 });
  }

  try {
    const data = await sendEmail({
      to: recipients.length === 1 ? recipients[0] : recipients,
      subject,
      ...(bodyText ? { body_text: bodyText } : {}),
      ...(bodyHtml ? { body_html: bodyHtml } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
      idempotency_key: idempotencyKey,
    });
    return NextResponse.json({ data }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ error: "primitive_send_failed" }, { status: 502 });
  }
}
