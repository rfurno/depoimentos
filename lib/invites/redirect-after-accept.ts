import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Project URL after invite accept (safe to call during page render). */
export async function projectRedirectPathAfterInvite(
  userId: string,
  projectId: string
): Promise<string> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', userId)
    .maybeSingle()

  const onboard = profile?.phone?.trim() ? '' : '?onboard=contact'
  return `/projects/${projectId}${onboard}`
}

/** Redirect an authenticated collaborator to the project (no cache revalidation). */
export async function redirectToProjectAfterInvite(userId: string, projectId: string) {
  redirect(await projectRedirectPathAfterInvite(userId, projectId))
}