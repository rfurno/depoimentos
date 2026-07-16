'use client'

import { useActionState } from 'react'
import { ArrowRight, Loader2, Phone, User } from 'lucide-react'
import { acceptProjectInvite, type AcceptInviteState } from '@/app/actions/invites'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: AcceptInviteState = {}

type InviteAcceptFormProps = {
  token: string
  suggestedName?: string | null
}

export function InviteAcceptForm({ token, suggestedName }: InviteAcceptFormProps) {
  const boundAccept = acceptProjectInvite.bind(null, token)
  const [state, formAction, pending] = useActionState(boundAccept, initialState)

  return (
    <form action={formAction} className="space-y-3 pt-2">
      <p className="text-sm text-center text-muted-foreground">
        Ao aceitar, você passará a ver e participar deste projeto conforme o papel do convite.
      </p>

      <div className="space-y-2">
        <Label htmlFor="accept-display-name">
          Seu nome <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="accept-display-name"
            name="displayName"
            type="text"
            autoComplete="name"
            placeholder="Como você quer aparecer"
            className="pl-9 bg-card"
            maxLength={120}
            disabled={pending}
            defaultValue={suggestedName?.trim() ?? ''}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Aparece nas fotos e comentários que você enviar.
        </p>
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
            Aceitando convite…
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
