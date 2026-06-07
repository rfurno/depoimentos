import { createClient } from '@/lib/supabase/server'
import { sanitizeRedirectPath } from '@/lib/auth/safe-redirect'
import { NextResponse } from 'next/server'

// Force dynamic — this route performs auth actions and shouldn't be prerendered.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient()
  const requestUrl = new URL(request.url)
  const redirectTo = sanitizeRedirectPath(requestUrl.searchParams.get('redirectTo'))

  // Check if a user's logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  const loginUrl = new URL('/login', request.url)
  if (redirectTo !== '/dashboard') {
    loginUrl.searchParams.set('redirectTo', redirectTo)
  }

  return NextResponse.redirect(loginUrl, { status: 302 })
}
