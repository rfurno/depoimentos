import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Pencil, Images } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { DeleteProjectButton } from '@/components/projects/delete-project-button'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { requireUser } from '@/lib/auth/server'
import { roleLabel } from '@/lib/projects/labels'
import { getDisplayName, getProjectAccess } from '@/lib/projects/queries'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params
  const user = await requireUser()
  const [displayName, access] = await Promise.all([
    getDisplayName(user.id, user.email),
    getProjectAccess(id, user.id),
  ])

  if (!access) {
    notFound()
  }

  const { project, role, isOwner } = access
  const createdLabel = format(new Date(project.created_at), "d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  })

  return (
    <AppShell displayName={displayName}>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-[#6b6057] hover:text-[#2c2522] mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar aos projetos
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-[#f0e9df] text-[#6b6057] border-0">
                {roleLabel(role)}
              </Badge>
              <span className="text-xs text-[#6b6057]">Criado em {createdLabel}</span>
            </div>
            <h1 className="text-4xl tracking-tighter font-semibold text-[#2c2522]">
              {project.title}
            </h1>
            {project.description ? (
              <p className="text-lg text-[#6b6057] max-w-2xl">{project.description}</p>
            ) : (
              <p className="text-[#6b6057] italic">Sem descrição</p>
            )}
          </div>

          {isOwner && (
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link
                href={`/projects/${project.id}/edit`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Link>
              <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
            </div>
          )}
        </div>

        <section className="mt-12 rounded-2xl border border-[#d9d0c3] bg-white p-12 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0e9df]">
            <Images className="h-7 w-7 text-[#8b5e3c]" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight mb-2">Galeria de fotos</h2>
          <p className="text-[#6b6057] max-w-md mx-auto text-sm">
            Upload de fotos, legendas e comentários chegam na <strong>Fase 3</strong>. Este
            projeto já está salvo e pronto para receber memórias.
          </p>
        </section>
      </main>
    </AppShell>
  )
}