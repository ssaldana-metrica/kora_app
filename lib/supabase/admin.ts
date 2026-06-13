import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente con service-role para tareas de servidor que NO tienen sesión de
 * usuario (cron jobs, workers). Salta RLS, así que SOLO debe usarse en código
 * de servidor (API routes, workers), nunca en el cliente.
 *
 * Requiere la variable de entorno SUPABASE_SERVICE_ROLE_KEY.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada en el servidor')
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
