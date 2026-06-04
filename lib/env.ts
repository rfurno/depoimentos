/**
 * Runtime environment variable validation.
 * Call this early (e.g. in middleware or root layout server code) to fail fast
 * with clear errors instead of mysterious 500s later.
 *
 * Never put secrets in client bundles — only NEXT_PUBLIC_* here.
 */

const REQUIRED_SUPABASE = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isBuild = process.env.NEXT_PHASE === 'phase-production-build' || process.env.CI === 'true'

  if (!url || !anonKey) {
    if (isBuild) {
      // During build we return placeholders so pages marked force-dynamic don't crash the build.
      // Real values are required at runtime.
      return {
        url: 'https://placeholder.supabase.co',
        anonKey: 'placeholder-anon-key-for-build',
      }
    }

    const msg =
      "Your project's URL and Key are required to create a Supabase client!\n\n" +
      "Copy .env.example to .env.local and fill in your Supabase project's API settings.\n" +
      "Find them here: https://supabase.com/dashboard/project/_/settings/api\n\n" +
      "After updating .env.local, restart the dev server."
    throw new Error(msg)
  }

  return { url, anonKey }
}

export function validateEnv() {
  const missing = REQUIRED_SUPABASE.filter((key) => !process.env[key])

  if (missing.length > 0) {
    const msg = `Missing required environment variables: ${missing.join(', ')}. ` +
      `Copy .env.example to .env.local and fill the values. ` +
      `Find your values at https://supabase.com/dashboard/project/_/settings/api`
    const isBuild = process.env.NEXT_PHASE === 'phase-production-build' || process.env.CI === 'true'
    if (!isBuild && process.env.NODE_ENV === 'production') {
      console.error('🚨 ' + msg)
    } else if (!isBuild) {
      console.error('\n' + '🚨 '.repeat(3) + msg + '\n')
    }
  }

  // Warn if public app URL is not set (impacts magic link reliability + Supabase config)
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    const warn = 'NEXT_PUBLIC_APP_URL is not set. Magic link emails will use the current browser origin. ' +
      'Set it in .env.local for production and configure it in Supabase Auth URL settings.'
    const isBuild = process.env.NEXT_PHASE === 'phase-production-build' || process.env.CI === 'true'
    if (!isBuild) {
      console.warn('⚠️ ' + warn)
    }
  }
}

// Call on import in key server entrypoints for early validation.
// Only run full validation on the server (avoids shipping unnecessary code to client bundles).
if (typeof window === 'undefined') {
  validateEnv()
}
