import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type InviteLoginResult = {
  error?: string
  userId?: string
  userEmail?: string | null
}

/**
 * Signs the user in without sending email: admin generateLink + verifyOtp on the server.
 * Creates the auth user if they do not exist yet (magiclink type).
 */
export async function establishSessionViaInviteMagicLink(
  email: string,
  redirectTo: string
): Promise<InviteLoginResult> {
  const admin = createAdminClient()
  if (!admin) {
    return { error: 'Configure SUPABASE_SERVICE_ROLE_KEY para aceitar convites.' }
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })

  const hashedToken = data?.properties?.hashed_token
  if (error || !hashedToken) {
    return { error: 'Não foi possível iniciar a entrada.' }
  }

  const supabase = await createClient()
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: hashedToken,
    type: data.properties.verification_type,
  })

  if (verifyError) {
    return { error: 'Não foi possível confirmar sua entrada.' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Não foi possível estabelecer a sessão.' }
  }

  return { userId: user.id, userEmail: user.email }
}