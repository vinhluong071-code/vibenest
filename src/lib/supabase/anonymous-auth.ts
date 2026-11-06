import type { Session } from "@supabase/supabase-js";
import { createClient } from "./client";

let pendingAnonymousSignIn: Promise<Session | null> | null = null;

/**
 * Reuse the current session or create one anonymous session.
 *
 * The shared promise is the mutex: app startup and any simultaneous
 * account-required actions all await the same request, preventing duplicate
 * anonymous users from being created by racing calls.
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
