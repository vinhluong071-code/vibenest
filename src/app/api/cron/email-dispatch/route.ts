import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type QueueRow = {
  id: string;
  recipient_id: string;
  event_type: "reply" | "message";
  entity_id: string;
  attempts: number;
};

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET ?? "";
  const authorization = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const supplied = Buffer.from(authorization);
  const authorized = cronSecret.length > 0 && expected.length === supplied.length && timingSafeEqual(expected, supplied);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const primitiveKey = process.env.PRIMITIVE_API_KEY;
  const primitiveFrom = process.env.PRIMITIVE_FROM_EMAIL;
  if (!supabaseUrl || !serviceRoleKey || !primitiveKey || !primitiveFrom) {
    return NextResponse.json({ error: "Email dispatch is not configured" }, { status: 503 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: queue, error: queueError } = await admin
    .from("vibenest_email_notification_queue")
    .select("id,recipient_id,event_type,entity_id,attempts")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(25);

  if (queueError) return NextResponse.json({ error: "Queue read failed" }, { status: 500 });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const item of (queue ?? []) as QueueRow[]) {
    const { data: claimed, error: claimError } = await admin
      .from("vibenest_email_notification_queue")
      .update({ status: "processing", attempts: item.attempts + 1 })
      .eq("id", item.id).eq("status", "pending").select("id").maybeSingle();
    if (claimError || !claimed) continue;

    try {
      const [{ data: userResult, error: userError }, { data: prefs, error: prefsError }] = await Promise.all([
        admin.auth.admin.getUserById(item.recipient_id),
        admin.from("vibenest_email_preferences")
          .select("email_on_replies,email_on_messages")
          .eq("user_id", item.recipient_id).maybeSingle(),
      ]);
      if (userError) throw userError;
      if (prefsError) throw prefsError;
      const user = userResult.user;
      const optedIn = item.event_type === "reply" ? prefs?.email_on_replies : prefs?.email_on_messages;
      if (!user?.email || !user.email_confirmed_at || !optedIn) {
        await admin.from("vibenest_email_notification_queue").update({ status: "skipped" }).eq("id", item.id);
        skipped += 1;
        continue;
      }

      const isReply = item.event_type === "reply";
      const subject = isReply ? "Có lời hồi âm mới trong VibeNest" : "Bạn có tin nhắn mới trên VibeNest";
      const body = isReply
        ? "Có người vừa gửi lời hồi âm cho tâm sự của bạn. Đăng nhập VibeNest để đọc và tiếp tục cuộc trò chuyện.\n\nNếu bạn không muốn nhận email này, hãy tắt mục Thông báo qua Email trong Tài khoản."
        : "Bạn vừa nhận được tin nhắn mới trong VibeNest. Đăng nhập để tiếp tục cuộc trò chuyện riêng tư.\n\nNếu bạn không muốn nhận email này, hãy tắt mục Thông báo qua Email trong Tài khoản.";
      const response = await fetch("https://api.primitive.dev/v1/send-mail", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${primitiveKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `vibenest-notification-${item.id}`,
        },
        body: JSON.stringify({
          from: primitiveFrom,
          to: user.email,
          subject,
          body_text: body,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      const result = await response.json().catch(() => ({})) as {
        success?: boolean;
        error?: { message?: string };
        message?: string;
      };
      if (!response.ok || result.success === false) {
        throw new Error(result.error?.message ?? result.message ?? `Primitive API returned ${response.status}`);
      }
      const { error: sentUpdateError } = await admin.from("vibenest_email_notification_queue")
        .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null }).eq("id", item.id);
      if (sentUpdateError) throw sentUpdateError;
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown mail error";
      await admin.from("vibenest_email_notification_queue")
        .update({ status: item.attempts + 1 >= 5 ? "failed" : "pending", last_error: message }).eq("id", item.id);
      failed += 1;
    }
  }

  return NextResponse.json({ processed: sent + skipped + failed, sent, skipped, failed });
}
