import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types'
import '@/lib/env' // pulls in validation (no-op on client)

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
