import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthHookPayload = {
  user?: {
    email?: string;
    new_email?: string;
  };
  email_data?: {
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type?: string;
    site_url?: string;
    token_new?: string;
    token_hash_new?: string;
  };
};

type Delivery = {
  to: string;
  token?: string;
  tokenHash?: string;
  actionType: string;
  label: "current" | "new" | "primary";
};

const otpTypes: Record<string, string> = {
  signup: "signup",
  invite: "invite",
  magiclink: "magiclink",
  recovery: "recovery",
  email_change: "email_change",
};

const subjects: Record<string, string> = {
  signup: "Xác nhận email VibeNest",
  invite: "Lời mời tham gia VibeNest",
  magiclink: "Đăng nhập VibeNest",
  recovery: "Khôi phục mật khẩu VibeNest",
  email_change: "Xác nhận thay đổi email VibeNest",
  reauthentication: "Xác minh lại tài khoản VibeNest",
  password_changed_notification: "Mật khẩu VibeNest đã được thay đổi",
  email_changed_notification: "Email tài khoản VibeNest đã được thay đổi",
  identity_linked_notification: "Phương thức đăng nhập VibeNest đã được liên kết",
  identity_unlinked_notification: "Phương thức đăng nhập VibeNest đã bị gỡ",
  phone_changed_notification: "Số điện thoại VibeNest đã được thay đổi",
};

const messages: Record<string, string> = {
  signup: "Hoàn tất xác minh để bảo vệ tài khoản và giữ lại những câu chuyện của bạn.",
  invite: "Bạn được mời tham gia VibeNest. Xác minh để tiếp tục.",
  magiclink: "Sử dụng liên kết an toàn bên dưới để đăng nhập VibeNest.",
  recovery: "Bạn vừa yêu cầu khôi phục quyền truy cập VibeNest. Nếu không phải bạn, hãy bỏ qua email này.",
  email_change: "Xác minh yêu cầu thay đổi địa chỉ email cho tài khoản VibeNest.",
  reauthentication: "Dùng mã xác minh bên dưới để xác nhận lại phiên đăng nhập VibeNest.",
  password_changed_notification: "Mật khẩu tài khoản VibeNest vừa được thay đổi. Nếu không phải bạn, hãy bảo vệ tài khoản ngay.",
  email_changed_notification: "Địa chỉ email của tài khoản VibeNest vừa được thay đổi.",
  identity_linked_notification: "Một phương thức đăng nhập mới vừa được liên kết với tài khoản VibeNest.",
  identity_unlinked_notification: "Một phương thức đăng nhập vừa bị gỡ khỏi tài khoản VibeNest.",
  phone_changed_notification: "Số điện thoại của tài khoản VibeNest vừa được thay đổi.",
};

function safeEqual(leftValue: string, rightValue: string): boolean {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);
  return left.length === right.length && timingSafeEqual(left, right);
}

function verifySupabaseSignature(request: NextRequest, rawBody: string): string | null {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET ?? "";
  const webhookId = request.headers.get("webhook-id") ?? "";
  const timestamp = request.headers.get("webhook-timestamp") ?? "";
  const signatures = request.headers.get("webhook-signature") ?? "";
  if (!secret.startsWith("v1,whsec_") || !webhookId || !timestamp || !signatures) return null;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) return null;

  const secretBase64 = secret.slice("v1,whsec_".length);
  const secretBytes = Buffer.from(secretBase64, "base64");
  if (!secretBytes.length) return null;
  const signedPayload = `${webhookId}.${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(signedPayload).digest("base64");

  const valid = signatures.split(" ").some((entry) => {
    const [version, signature] = entry.split(",", 2);
    return version === "v1" && Boolean(signature) && safeEqual(signature, expected);
  });
  return valid ? webhookId : null;
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (character) => entities[character] ?? character);
}

function buildActionUrl(redirectTo: string | undefined, siteUrl: string | undefined, tokenHash: string, actionType: string): string {
  const base = process.env.VIBENEST_APP_URL || siteUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error("Missing VibeNest site URL for auth email.");
  const target = redirectTo ? new URL(redirectTo, base) : new URL("/auth/callback", base);
  if (target.protocol !== "https:" && target.protocol !== "http:") throw new Error("Invalid auth redirect URL.");
  if (target.pathname !== "/auth/callback") {
    const nextPath = `${target.pathname}${target.search}${target.hash}`;
    target.pathname = "/auth/callback";
    target.search = "";
    target.hash = "";
    target.searchParams.set("next", nextPath.startsWith("/") ? nextPath : "/");
  }
  target.searchParams.set("token_hash", tokenHash);
  target.searchParams.set("type", actionType);
  return target.toString();
}

function buildDeliveries(payload: AuthHookPayload): Delivery[] {
  const user = payload.user ?? {};
  const email = payload.email_data ?? {};
  const actionType = email.email_action_type ?? "signup";
  const result: Delivery[] = [];

  if (actionType === "email_change") {
    if (user.email && email.token && email.token_hash_new) {
      result.push({
        to: user.email,
        token: email.token,
        tokenHash: email.token_hash_new,
        actionType,
        label: "current",
      });
    }
    if (user.new_email && email.token_new && email.token_hash) {
      result.push({
        to: user.new_email,
        token: email.token_new,
        tokenHash: email.token_hash,
        actionType,
        label: "new",
      });
    }
    const fallbackToken = email.token_new || email.token;
    if (!result.length && (user.new_email || user.email) && fallbackToken && email.token_hash) {
      result.push({
        to: user.new_email || user.email!,
        token: fallbackToken,
        tokenHash: email.token_hash,
        actionType,
        label: "primary",
      });
    }
    return result;
  }

  const recipient = user.new_email || user.email;
  if (!recipient) return [];
  result.push({
    to: recipient,
    token: email.token,
    tokenHash: email.token_hash,
    actionType,
    label: "primary",
  });
  return result;
}

async function sendPrimitiveEmail(
  delivery: Delivery,
  payload: AuthHookPayload,
  webhookId: string,
  index: number,
): Promise<void> {
  const apiKey = process.env.PRIMITIVE_API_KEY;
  const from = process.env.PRIMITIVE_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Primitive email provider is not configured.");

  const email = payload.email_data ?? {};
  const actionType = delivery.actionType;
  const actionUrl = delivery.tokenHash && otpTypes[actionType]
    ? buildActionUrl(email.redirect_to, email.site_url, delivery.tokenHash, otpTypes[actionType])
    : undefined;
  const subject = subjects[actionType] ?? "Thông báo bảo mật tài khoản VibeNest";
  const message = messages[actionType] ?? "Có cập nhật bảo mật liên quan đến tài khoản VibeNest.";
  const linkText = actionType === "magiclink" ? "Đăng nhập VibeNest" : "Xác minh tài khoản VibeNest";
  const tokenLine = delivery.token ? `Mã xác minh: ${delivery.token}` : "";
  const textBody = [
    "Xin chào,",
    "",
    message,
    actionUrl ? `${linkText}: ${actionUrl}` : "",
    tokenLine,
    "",
    "Nếu bạn không thực hiện thao tác này, hãy bỏ qua email và không chia sẻ mã xác minh với bất kỳ ai.",
    "VibeNest",
  ].filter(Boolean).join("\n");
  const htmlBody = `<!doctype html><html lang="vi"><body style="margin:0;background:#0b0f19;color:#f8fafc;font-family:Arial,sans-serif;padding:32px"><main style="max-width:520px;margin:auto;background:#141b2b;border:1px solid #34405b;border-radius:20px;padding:28px"><p style="color:#a5b4fc;font-size:12px;letter-spacing:2px;font-weight:bold">VIBENEST</p><h1 style="font-size:22px"> ${escapeHtml(subject)} </h1><p style="line-height:1.6;color:#dbe3f2">${escapeHtml(message)}</p>${actionUrl ? `<p style="margin:28px 0"><a href="${escapeHtml(actionUrl)}" style="background:#818cf8;color:#111827;text-decoration:none;padding:13px 20px;border-radius:12px;font-weight:bold;display:inline-block">${escapeHtml(linkText)}</a></p>` : ""}${delivery.token ? `<p style="color:#cbd5e1">Mã xác minh: <strong style="font-size:22px;letter-spacing:4px;color:#fff">${escapeHtml(delivery.token)}</strong></p>` : ""}<p style="font-size:12px;line-height:1.6;color:#94a3b8">Nếu bạn không thực hiện thao tác này, hãy bỏ qua email và không chia sẻ mã xác minh với bất kỳ ai.</p></main></body></html>`;

  const response = await fetch("https://api.primitive.dev/v1/send-mail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Idempotency-Key": `vibenest-auth-${webhookId}-${index}`,
    },
    body: JSON.stringify({
      from,
      to: delivery.to,
      subject,
      body_text: textBody,
      body_html: htmlBody,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(4500),
  });
  const result = await response.json().catch(() => ({})) as {
    success?: boolean;
    error?: { message?: string };
    message?: string;
  };
  if (!response.ok || result.success === false) {
    throw new Error(result.error?.message ?? result.message ?? `Primitive returned ${response.status}`);
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const webhookId = verifySupabaseSignature(request, rawBody);
  if (!webhookId) return NextResponse.json({ error: { http_code: 401, message: "Invalid webhook signature." } }, { status: 401 });

  let payload: AuthHookPayload;
  try {
    payload = JSON.parse(rawBody) as AuthHookPayload;
  } catch {
    return NextResponse.json({ error: { http_code: 400, message: "Invalid JSON payload." } }, { status: 400 });
  }

  const deliveries = buildDeliveries(payload);
  if (!deliveries.length) {
    return NextResponse.json({ error: { http_code: 400, message: "No valid recipient for auth email." } }, { status: 400 });
  }

  try {
    await Promise.all(deliveries.map((delivery, index) => sendPrimitiveEmail(delivery, payload, webhookId, index)));
    return new Response(null, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: { http_code: 502, message: "Primitive could not accept the authentication email." } }, { status: 502 });
  }
}
