import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseConfig } from '@/lib/env'
import { parseInviteToken, sanitizeRedirectPath } from '@/lib/auth/safe-redirect'
import { redeemProjectInvite } from '@/lib/invites/redeem'
import type { Database } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const redirectTo = sanitizeRedirectPath(searchParams.get('redirectTo'))
  const origin = request.nextUrl.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const { url, anonKey } = getSupabaseConfig()
  const cookieStore = await cookies()
  const redirectResponse = NextResponse.redirect(`${origin}${redirectTo}`)

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          redirectResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const inviteToken = parseInviteToken(searchParams.get('invite'))
  if (inviteToken) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const result = await redeemProjectInvite(inviteToken, user.id, user.email)
      if (result.projectId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', user.id)
          .maybeSingle()
        const onboard =
          profile?.phone?.trim() ? '' : '?onboard=contact'
        return NextResponse.redirect(
          `${origin}/projects/${result.projectId}${onboard}`
        )
      }
      const inviteError = encodeURIComponent(result.error ?? 'Não foi possível aceitar o convite.')
      return NextResponse.redirect(`${origin}/invite/${inviteToken}?error=${inviteError}`)
    }
  }

  return redirectResponse
}