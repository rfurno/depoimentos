import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'
import { getSupabaseConfig } from '@/lib/env'

/**
 * Service-role client for server-only operations (signed URLs on private buckets).
 * Never import this module from client components.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return null

  const { url } = getSupabaseConfig()
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}