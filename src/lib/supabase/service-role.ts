import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con privilegios elevados para Storage u otras operaciones de servidor
 * que no encajan en las políticas RLS del usuario (si `SUPABASE_SERVICE_ROLE_KEY` está definida).
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.trim() || !key?.trim()) {
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
