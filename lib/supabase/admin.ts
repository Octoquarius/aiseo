import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Used ONLY on the server, for trusted
// operations (e.g. writing analysis results). Never leak this to the client.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
