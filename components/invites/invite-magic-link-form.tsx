'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ArrowRight, CheckCircle, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { setPendingInviteCookie } from '@/lib/auth/invite-cookie'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  email: z.string().email('Por favor, insira um endereço de e-mail válido'),
})

type FormValues = z.infer<typeof schema>

type InviteMagicLinkFormProps = {
  token: string
  suggestedEmail?: string | null
}

export function InviteMagicLinkForm({ token, suggestedEmail }: InviteMagicLinkFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [sentTo, setSentTo] = useState('')

  const emailLocked = Boolean(suggestedEmail?.trim())

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: suggestedEmail?.trim() ?? '',
    },
  })

  async function onSubmit(data: FormValues) {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const appOrigin = window.location.origin
      setPendingInviteCookie(token)
      const callbackUrl = `${appOrigin}/auth/callback?invite=${encodeURIComponent(token)}`
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: { emailRedirectTo: callbackUrl },
      })
      if (error) throw error

      setSentTo(data.email)
      setEmailSent(true)
      toast.success('Link enviado! Verifique seu e-mail.', {
        description: 'Ao clicar no link, você entra e vai direto ao projeto.',
      })
    } catch (error: unknown) {
      const message =
        (error as { message?: string })?.message ||
        'Não foi possível enviar o link. Tente novamente.'
      toast.error('Falha ao enviar link', { description: message })
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="space-y-3 pt-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <CheckCircle className="h-6 w-6 icon-brand" />
        </div>
        <p className="text-sm text-muted-foreground">
          Enviamos um link de entrada para{' '}
          <span className="font-medium text-foreground">{sentTo}</span>.
          Clique no e-mail para entrar e aceitar o convite automaticamente.
        </p>
        <button
          type="button"
          onClick={() => {
            setEmailSent(false)
            form.reset({ email: sentTo })
          }}
          className="text-sm link-brand underline hover:no-underline font-medium"
        >
          Enviar de novo
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 pt-2">
      <p className="text-sm text-center text-muted-foreground">
        {emailLocked
          ? 'Enviaremos um link de entrada para o e-mail do convite. Um clique e você já estará no projeto.'
          : 'Informe seu e-mail para receber um link de entrada. Ao clicar, você aceita o convite automaticamente.'}
      </p>

      <div className="space-y-2">
        <Label htmlFor="invite-login-email">E-mail</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="invite-login-email"
            type="email"
            autoComplete="email"
            className="pl-9 bg-card"
            readOnly={emailLocked}
            disabled={isLoading}
            {...form.register('email')}
          />
        </div>
        {form.formState.errors.email && (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={buttonVariants({
          className:
            'w-full h-12 btn-primary-gradient rounded-full font-semibold text-base disabled:opacity-60',
        })}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando link…
          </>
        ) : (
          <>
            Enviar link e aceitar convite
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </button>
    </form>
  )
}