import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Successful sign in - redirect, preserving any intended path.
      // SECURITY: Strictly validate redirectTo to prevent open redirect attacks
      // (e.g. //evil.com protocol-relative redirects).
      let safeRedirect = '/dashboard'
      if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
        // Additional safety: no protocol or host in path, no javascript: etc.
        const firstSegment = redirectTo.split('?')[0].split('#')[0]
        if (!firstSegment.includes(':') && !firstSegment.includes('@')) {
          safeRedirect = redirectTo
        }
      }
      return NextResponse.redirect(`${origin}${safeRedirect}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
