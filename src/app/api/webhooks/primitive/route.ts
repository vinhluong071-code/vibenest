import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifyPrimitiveSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.PRIMITIVE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const timestampMatch = /(?:^|,)t=(\d+)/.exec(signatureHeader);
  const signatureMatch = /(?:^|,)v1=([a-f0-9]{64})(?:,|$)/i.exec(signatureHeader);
  if (!timestampMatch || !signatureMatch) return false;

  const timestamp = Number(timestampMatch[1]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestampMatch[1]}.`)
    .update(rawBody)
    .digest();
  const supplied = Buffer.from(signatureMatch[1], "hex");
  return supplied.length === expected.length && timingSafeEqual(expected, supplied);
}

export async function POST(request: NextRequest) {
  const rawBody = Buffer.from(await request.arrayBuffer());
  if (!verifyPrimitiveSignature(rawBody, request.headers.get("primitive-signature"))) {
    return NextResponse.json({ error: "invalid_primitive_signature" }, { status: 401 });
  }

  let event: { id?: unknown; event?: unknown; email?: { id?: unknown } };
  try {
    event = JSON.parse(rawBody.toString("utf8")) as typeof event;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const eventId = typeof event.id === "string" ? event.id : "";
  const eventType = request.headers.get("x-webhook-event") ||
    (typeof event.event === "string" ? event.event : "");
  const emailId = typeof event.email?.id === "string" ? event.email.id : null;
  if (!eventId || eventId.length > 200 || !eventType.startsWith("email.")) {
    return NextResponse.json({ error: "invalid_email_event" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "agent_mail_storage_not_configured" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase
    .from("vibenest_agent_mail_events")
    .upsert({
      event_id: eventId,
      event_type: eventType,
      email_id: emailId,
      payload: event,
    }, { onConflict: "event_id", ignoreDuplicates: true });

  if (error) {
    return NextResponse.json({ error: "agent_mail_event_store_failed" }, { status: 503 });
  }

  return NextResponse.json({ ok: true }, {
    status: 202,
    headers: { "Cache-Control": "no-store" },
  });
}
