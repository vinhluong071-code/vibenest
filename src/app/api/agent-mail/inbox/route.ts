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

/** Private polling endpoint for the VibeNest agent; never expose Primitive credentials to the browser. */
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
  const status = incoming.searchParams.get("status");
  if (status && ["pending", "accepted", "completed", "rejected"].includes(status)) upstream.searchParams.set("status", status);

  try {
    const response = await fetch(upstream, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const payload = await response.json() as { success?: boolean; data?: unknown; meta?: unknown; error?: { code?: string; message?: string; request_id?: string } };
    if (!response.ok || payload.success === false) {
      return NextResponse.json({
        error: "primitive_request_failed",
        code: payload.error?.code ?? "upstream_error",
        requestId: payload.error?.request_id,
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ data: payload.data ?? [], meta: payload.meta ?? null }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ error: "primitive_unavailable" }, { status: 502 });
  }
}
