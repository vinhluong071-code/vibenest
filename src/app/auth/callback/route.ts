import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const nextPath = url.searchParams.get("next") ?? "/";
  let redirectUrl = new URL("/", url.origin);
  if (nextPath.startsWith("/") && !nextPath.startsWith("//") && !nextPath.includes("\\\\") && !/[\\u0000-\\u001f]/.test(nextPath)) {
    try {
      const candidate = new URL(nextPath, url.origin);
      if (candidate.origin === url.origin) redirectUrl = candidate;
    } catch {
      // Invalid or malformed post-authentication paths always fall back to the app home.
    }
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) return NextResponse.redirect(new URL("/?auth=configuration_error", url.origin));

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
      },
    },
  });

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  let authError: unknown = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error;
  } else if (tokenHash && type) {
    const allowedTypes: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];
    if (!allowedTypes.includes(type as EmailOtpType)) {
      authError = new Error("Unsupported email verification type.");
    } else {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType,
      });
      authError = error;
    }
  } else {
    authError = new Error("Missing auth confirmation token.");
  }

  if (authError) {
    redirectUrl.searchParams.set("auth", "confirmation_error");
  }
  return NextResponse.redirect(redirectUrl);
}
