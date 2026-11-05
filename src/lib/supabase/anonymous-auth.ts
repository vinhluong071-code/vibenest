import { createClient } from "./client";

/**
 * Call only from an explicit "Continue anonymously" user action.
 * Never call automatically on every page load.
 */
export async function signInAnonymously() {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();

  if (sessionData.session) return sessionData.session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}
