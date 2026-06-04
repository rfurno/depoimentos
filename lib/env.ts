/**
 * Runtime environment variable validation.
 * Call this early (e.g. in middleware or root layout server code) to fail fast
 * with clear errors instead of mysterious 500s later.
 *
 * Never put secrets in client bundles — only NEXT_PUBLIC_* here.
 */
export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ] as const

  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    const msg = `Missing required environment variables: ${missing.join(', ')}. ` +
      `Copy .env.example to .env.local and fill the values.`
    // Never throw during `next build` (CI/build servers often don't have runtime secrets yet).
    // Fail loudly only at actual server runtime (when the app starts serving requests).
    const isBuild = process.env.NEXT_PHASE === 'phase-production-build' || process.env.CI === 'true'
    if (!isBuild && process.env.NODE_ENV === 'production') {
      // In a real production server start (e.g. after deploy), we can be stricter.
      console.error('🚨 ' + msg)
      // Optionally: process.exit(1) in a custom server, but for Vercel/Next standard hosting we just log.
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
