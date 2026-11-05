import type { Session } from "@supabase/supabase-js";
import { createClient } from "./client";

let pendingAnonymousSignIn: Promise<Session | null> | null = null;

/**
 * Call only from an explicit user action. Reuse an existing session and
 * coalesce concurrent requests so multiple clicks cannot create many users.
 */
export async function signInAnonymously(): Promise<Session | null> {
  if (pendingAnonymousSignIn) return pendingAnonymousSignIn;

  pendingAnonymousSignIn = (async () => {
    const supabase = createClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    if (sessionData.session) return sessionData.session;

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data.session;
  })();

  try {
    return await pendingAnonymousSignIn;
  } finally {
    pendingAnonymousSignIn = null;
  }
}
