import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { replyToEmail } from "@/lib/primitive/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const expected = process.env.VIBENEST_AGENT_API_SECRET ?? "";
  const supplied = request.headers.get("x-vibenest-agent-secret") ?? "";
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > 150_000) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 150_000) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }
  let input: unknown;
  try { input = JSON.parse(rawBody); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!input || typeof input !== "object") return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const body = input as { email_id?: unknown; body_text?: unknown; body_html?: unknown; idempotency_key?: unknown };
  const emailId = typeof body.email_id === "string" ? body.email_id.trim() : "";
  const bodyText = typeof body.body_text === "string" ? body.body_text : undefined;
  const bodyHtml = typeof body.body_html === "string" ? body.body_html : undefined;
  const idempotencyKey = typeof body.idempotency_key === "string" ? body.idempotency_key.trim() : "";
  if (!emailId || (!bodyText && !bodyHtml) ||
      (bodyText && bodyText.length > 50000) || (bodyHtml && bodyHtml.length > 100000) ||
      !idempotencyKey || idempotencyKey.length > 255) {
    return NextResponse.json({ error: "invalid_reply_fields" }, { status: 400 });
  }

  try {
    const data = await replyToEmail(emailId, {
      ...(bodyText ? { body_text: bodyText } : {}),
      ...(bodyHtml ? { body_html: bodyHtml } : {}),
      ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
    });
    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "primitive_reply_failed" }, { status: 502 });
  }
}
