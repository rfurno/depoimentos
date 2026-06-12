'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Mail, Phone } from 'lucide-react'
import { acceptInviteWithLogin, type AcceptInviteState } from '@/app/actions/invites'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: AcceptInviteState = {}

type InviteMagicLinkFormProps = {
  token: string
  suggestedEmail?: string | null
}

export function InviteMagicLinkForm({ token, suggestedEmail }: InviteMagicLinkFormProps) {
  const router = useRouter()
  const emailLocked = Boolean(suggestedEmail?.trim())
  const boundAccept = acceptInviteWithLogin.bind(null, token)
  const [state, formAction, pending] = useActionState(boundAccept, initialState)

  useEffect(() => {
    if (state.projectId && !state.error) {
      router.push(`/projects/${state.projectId}?onboard=contact`)
    }
  }, [state.projectId, state.error, router])

  return (
    <form action={formAction} className="space-y-3 pt-2">
      <p className="text-sm text-center text-muted-foreground">
        {emailLocked
          ? 'Um clique e você entra no projeto — sem precisar de outro e-mail.'
          : 'Informe seu e-mail para aceitar o convite e entrar no projeto.'}
      </p>

      <div className="space-y-2">
        <Label htmlFor="invite-login-email">E-mail</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="invite-login-email"
            name="email"
            type="email"
            autoComplete="email"
            className="pl-9 bg-card"
            readOnly={emailLocked}
            disabled={pending}
            defaultValue={suggestedEmail?.trim() ?? ''}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="accept-phone" className="text-sm text-muted-foreground">
          Telefone (opcional)
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="accept-phone"
            name="phone"
            type="tel"
            placeholder="+55 11 99999-9999"
            className="pl-9 bg-card"
            disabled={pending}
          />
        </div>
      </div>

      {state.error && (
        <p className="text-sm rounded-lg px-4 py-3 border text-destructive bg-destructive/10 border-destructive/20">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={buttonVariants({
          className:
            'w-full h-12 btn-primary-gradient rounded-full font-semibold text-base disabled:opacity-60',
        })}
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Entrando e aceitando…
          </>
        ) : (
          <>
            Aceitar convite
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </button>
    </form>
  )
}