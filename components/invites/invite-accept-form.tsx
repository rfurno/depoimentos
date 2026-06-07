'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'
import { acceptProjectInvite, type AcceptInviteState } from '@/app/actions/invites'
import { buttonVariants } from '@/components/ui/button'

const initialState: AcceptInviteState = {}

type InviteAcceptFormProps = {
  token: string
}

export function InviteAcceptForm({ token }: InviteAcceptFormProps) {
  const router = useRouter()
  const boundAccept = acceptProjectInvite.bind(null, token)
  const [state, formAction, pending] = useActionState(boundAccept, initialState)

  useEffect(() => {
    if (state.projectId && !state.error) {
      router.push(`/projects/${state.projectId}`)
    }
  }, [state.projectId, state.error, router])

  return (
    <form action={formAction} className="space-y-3 pt-2">
      <p className="text-sm text-center text-[#6b6057]">
        Ao aceitar, você passará a ver e participar deste projeto conforme o papel do convite.
      </p>

      {state.error && (
        <p className="text-sm rounded-lg px-4 py-3 border text-[#b85c38] bg-[#fdf2ef] border-[#b85c38]/20">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={buttonVariants({
          className:
            'w-full h-12 rounded-full bg-[#8b5e3c] hover:bg-[#6f4a30] text-base disabled:opacity-60',
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