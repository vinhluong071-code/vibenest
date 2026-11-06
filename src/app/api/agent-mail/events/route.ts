import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Agent event storage is not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Fetch verified inbound events for the private VibeNest Agent worker. */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const limitValue = Number(new URL(request.url).searchParams.get("limit") ?? "25");
    const limit = Number.isFinite(limitValue) ? Math.min(50, Math.max(1, Math.floor(limitValue))) : 25;
    const { data, error } = await adminClient()
      .from("vibenest_agent_mail_events")
      .select("event_id,event_type,email_id,payload,received_at")
      .is("processed_at", null)
      .order("received_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return NextResponse.json({ data: data ?? [] }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ error: "agent_event_store_unavailable" }, { status: 503 });
  }
}

/** Acknowledge an event only after the Agent has completed its processing. */
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let input: unknown;
  try { input = await request.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const eventId = input && typeof input === "object" && "event_id" in input &&
    typeof input.event_id === "string" ? input.event_id : "";
  if (!eventId || eventId.length > 200) return NextResponse.json({ error: "invalid_event_id" }, { status: 400 });

  try {
    const { data, error } = await adminClient()
      .from("vibenest_agent_mail_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("event_id", eventId)
      .is("processed_at", null)
      .select("event_id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "event_not_pending" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "agent_event_ack_failed" }, { status: 503 });
  }
}
