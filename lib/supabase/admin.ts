import { createClient } from "@supabase/supabase-js";

// Service-role istemcisi — RLS'i bypass eder. SADECE sunucu tarafında, güvenilir
// işlemler (ör. analiz sonuçlarını yazma) için kullanılır. Asla istemciye sızdırma.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
