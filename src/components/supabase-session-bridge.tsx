"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Initializes the browser Supabase client without creating an account
 * automatically. Anonymous sign-in is an explicit product action.
 */
export function SupabaseSessionBridge() {
  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) return;

    const supabase = createClient();
    void supabase.auth.getSession();
  }, []);

  return null;
}
