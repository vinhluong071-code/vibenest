import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

function safeRedirect(path: string, origin: string): URL {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    /%(?:2f|5c)/i.test(path) ||
    /[\u0000-\u001f\u007f]/.test(path)
  ) {
    return new URL("/", origin);
  }
  try {
    const candidate = new URL(path, origin);
    return candidate.origin === origin ? candidate : new URL("/", origin);
  } catch {
    return new URL("/", origin);
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const redirectUrl = safeRedirect(requestUrl.searchParams.get("next") ?? "/", origin);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL("/?auth=configuration_error", origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  let authError: unknown = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error;
  } else if (tokenHash && type) {
    const allowed: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];
    if (!allowed.includes(type as EmailOtpType)) {
      authError = new Error("Unsupported verification type.");
    } else {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType,
      });
      authError = error;
    }
  } else {
    authError = new Error("Missing OAuth confirmation code.");
  }

  if (authError) redirectUrl.searchParams.set("auth", "confirmation_error");
  return NextResponse.redirect(redirectUrl);
}
