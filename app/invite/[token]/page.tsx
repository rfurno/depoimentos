import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, Mail, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redeemProjectInvite } from '@/lib/invites/redeem'
import { getInvitePreview } from '@/lib/invites/queries'
import { inviteRoleShortLabel } from '@/lib/invites/labels'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params
  const preview = await getInvitePreview(token)

  if (!preview) {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const invitePath = `/invite/${preview.token}`
  const loginHref = `/login?redirectTo=${encodeURIComponent(invitePath)}`

  let statusMessage: string | null = null
  let statusVariant: 'muted' | 'error' = 'muted'
  let projectLinkId: string | null = null

  if (preview.isExpired) {
    statusMessage = 'Este convite expirou. Peça um novo link ao proprietário do projeto.'
  } else if (preview.isRedeemed) {
    statusMessage = 'Este convite já foi utilizado.'
    projectLinkId = preview.projectId
  } else if (user) {
    const result = await redeemProjectInvite(token, user.id)
    if (result.projectId && !result.error) {
      redirect(`/projects/${result.projectId}`)
    }
    if (result.alreadyMember && result.projectId) {
      redirect(`/projects/${result.projectId}`)
    }
    statusMessage = result.error ?? null
    statusVariant = 'error'
    if (result.projectId) projectLinkId = result.projectId
  }

  const expiresLabel = format(new Date(preview.expiresAt), "d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  })

  const showLoginCta = !user && preview.canRedeem

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col">
      <header className="border-b border-[#d9d0c3]/60 bg-[#faf8f5]/90 backdrop-blur-sm">
        <div className="mx-auto max-w-lg px-6 py-5 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight text-xl text-[#2c2522]">
            Storyloom
          </Link>
          {user ? (
            <Link href="/dashboard" className="text-sm text-[#6b6057] hover:text-[#2c2522]">
              Meus projetos
            </Link>
          ) : (
            <Link href="/login" className="text-sm text-[#6b6057] hover:text-[#2c2522]">
              Entrar
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md border-[#d9d0c3] shadow-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#e8e0d5]">
              <Users className="h-7 w-7 text-[#8b5e3c]" />
            </div>
            <CardTitle className="text-2xl tracking-tight">Convite para colaborar</CardTitle>
            <CardDescription className="text-base pt-2 text-[#6b6057]">
              Você foi convidado(a) para participar de
            </CardDescription>
            <p className="text-xl font-semibold text-[#2c2522] pt-1">{preview.projectTitle}</p>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary" className="bg-[#f0e9df] text-[#6b6057] border-0">
                {inviteRoleShortLabel(preview.role)}
              </Badge>
              <span className="text-xs text-[#6b6057] self-center">Válido até {expiresLabel}</span>
            </div>

            {preview.email && (
              <p className="text-sm text-center text-[#6b6057] flex items-center justify-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                Convite enviado para{' '}
                <span className="font-medium text-[#2c2522]">{preview.email}</span>
              </p>
            )}

            {statusMessage && (
              <p
                className={`text-sm rounded-lg px-4 py-3 border ${
                  statusVariant === 'error'
                    ? 'text-[#b85c38] bg-[#fdf2ef] border-[#b85c38]/20'
                    : 'text-[#6b6057] bg-[#f0e9df] border-[#d9d0c3]'
                }`}
              >
                {statusMessage}
              </p>
            )}

            {showLoginCta && (
              <div className="space-y-3 pt-2">
                <p className="text-sm text-center text-[#6b6057]">
                  Entre com seu e-mail (link mágico, sem senha) para aceitar o convite e ver as fotos
                  do projeto.
                </p>
                <Link
                  href={loginHref}
                  className={buttonVariants({
                    className:
                      'w-full h-12 rounded-full bg-[#8b5e3c] hover:bg-[#6f4a30] text-base',
                  })}
                >
                  Entrar e aceitar convite
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            )}

            {projectLinkId && (
              <Link
                href={`/projects/${projectLinkId}`}
                className={buttonVariants({ variant: 'outline', className: 'w-full' })}
              >
                Ir para o projeto
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            )}

            {!process.env.SUPABASE_SERVICE_ROLE_KEY && preview.canRedeem && (
              <p className="text-xs text-[#b85c38] text-center">
                Configure{' '}
                <code className="bg-white px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> em{' '}
                <code className="bg-white px-1 rounded">.env.local</code> para aceitar convites.
              </p>
            )}

            <div className="pt-2 text-center">
              <Link href="/" className="text-sm text-[#6b6057] hover:text-[#2c2522]">
                Voltar à página inicial
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}