import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client: BYPASSES ROW LEVEL SECURITY ENTIRELY.
// Server-only. Never import this from a Client Component or anything that
// gets bundled to the browser — it holds full admin access to the database.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
