import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Send an authenticated collaborator straight to the project after invite accept. */
export async function redirectToProjectAfterInvite(userId: string, projectId: string) {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', userId)
    .maybeSingle()

  const onboard = profile?.phone?.trim() ? '' : '?onboard=contact'
  revalidatePath(`/projects/${projectId}`)
  redirect(`/projects/${projectId}${onboard}`)
}