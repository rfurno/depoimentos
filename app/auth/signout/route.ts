import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Force dynamic — this route performs auth actions and shouldn't be prerendered.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient()

  // Check if a user's logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  return NextResponse.redirect(new URL('/login', request.url), {
    status: 302,
  })
}
