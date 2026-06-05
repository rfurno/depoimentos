import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { sanitizeRedirectPath } from '@/lib/auth/safe-redirect'
import { getSupabaseConfig, validateEnv } from '@/lib/env'

// Run validation for console warnings on every request in dev
if (typeof window === 'undefined') {
  validateEnv()
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Protected routes that require authentication
  const protectedPaths = ['/dashboard', '/projects', '/admin']
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  // If Supabase env vars are not configured, allow public pages (landing, login UI)
  // to render so the user can see instructions. Only block protected routes.
  let supabase: Awaited<ReturnType<typeof createServerClient>> | null = null
  try {
    const { url, anonKey } = getSupabaseConfig()
    supabase = createServerClient(
      url,
      anonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )
  } catch {
    // Missing Supabase configuration (common during first setup)
    if (isProtectedPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'supabase_not_configured')
      return NextResponse.redirect(url)
    }
    // Public page — allow it through without Supabase (no auth check possible)
    return supabaseResponse
  }

  // At this point we know Supabase is configured (otherwise we returned early above)
  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase!.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  // Note: /auth/* (callback, signout) are route handlers that must always execute
  // even for authenticated users (they perform signOut / code exchange).

  if (!user && isProtectedPath) {
    // no user, potentially respond by redirecting to login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', sanitizeRedirectPath(request.nextUrl.pathname))
    return NextResponse.redirect(url)
  }

  // If user is logged in and trying to access auth pages, honor redirectTo when safe
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = sanitizeRedirectPath(request.nextUrl.searchParams.get('redirectTo'))
    url.search = ''
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
