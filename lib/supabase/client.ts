import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types'
import { getSupabaseConfig } from '@/lib/env'

export function createClient() {
  const { url, anonKey } = getSupabaseConfig()
  return createBrowserClient<Database>(url, anonKey)
}
