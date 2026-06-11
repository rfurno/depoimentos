import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseConfig } from '@/lib/env'
import { parseInviteToken, sanitizeRedirectPath } from '@/lib/auth/safe-redirect'
import {
  PENDING_INVITE_COOKIE,
  readPendingInviteCookie,
} from '@/lib/auth/invite-cookie'
import { redeemProjectInvite } from '@/lib/invites/redeem'
import type { Database } from '@/lib/types'

export const dynamic = 'force-dynamic'

type SessionCookie = {
  name: string
  value: string
  options?: Parameters<NextResponse['cookies']['set']>[2]
}

function attachSessionCookies(response: NextResponse, sessionCookies: SessionCookie[]) {
  sessionCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const origin = request.nextUrl.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const { url, anonKey } = getSupabaseConfig()
  const cookieStore = await cookies()
  const sessionCookies: SessionCookie[] = []

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach((cookie) => {
          sessionCookies.push(cookie)
          cookieStore.set(cookie.name, cookie.value, cookie.options)
        })
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  let destination = sanitizeRedirectPath(searchParams.get('redirectTo'))

  const inviteToken =
    parseInviteToken(searchParams.get('invite')) ??
    parseInviteToken(
      readPendingInviteCookie(cookieStore.get(PENDING_INVITE_COOKIE)?.value)
    )

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
        const onboard = profile?.phone?.trim() ? '' : '?onboard=contact'
        destination = `/projects/${result.projectId}${onboard}`
      } else {
        const inviteError = encodeURIComponent(
          result.error ?? 'Não foi possível aceitar o convite.'
        )
        destination = `/invite/${inviteToken}?error=${inviteError}`
      }
    }
  }

  const response = NextResponse.redirect(`${origin}${destination}`)
  attachSessionCookies(response, sessionCookies)
  response.cookies.delete(PENDING_INVITE_COOKIE)
  return response
}