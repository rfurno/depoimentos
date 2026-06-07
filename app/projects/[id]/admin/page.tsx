import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Settings } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { ProjectAdminClient } from '@/components/admin/project-admin-client'
import {
  getAdminPhotos,
  getModerationComments,
  getProjectCollaborators,
} from '@/lib/admin/queries'
import { requireProjectOwner } from '@/lib/admin/permissions'
import { requireUser } from '@/lib/auth/server'
import { getDisplayName, getProjectAccess } from '@/lib/projects/queries'
import { buttonVariants } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function ProjectAdminPage({ params }: PageProps) {
  const { id } = await params
  const user = await requireUser()
  const [displayName, access] = await Promise.all([
    getDisplayName(user.id, user.email),
    getProjectAccess(id, user.id),
  ])

  if (!access) notFound()
  if (!requireProjectOwner(access)) {
    redirect(`/projects/${access.project.id}`)
  }

  const { project } = access
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

  const [photos, collaborators, comments] = await Promise.all([
    getAdminPhotos(project.id),
    getProjectCollaborators(project.id),
    getModerationComments(project.id),
  ])

  return (
    <AppShell displayName={displayName}>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center text-sm text-[#6b6057] hover:text-[#2c2522] mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao projeto
        </Link>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-[#8b5e3c] mb-1">
              <Settings className="h-5 w-5" />
              <span className="text-sm font-medium">Administração</span>
            </div>
            <h1 className="text-3xl tracking-tighter font-semibold text-[#2c2522]">
              {project.title}
            </h1>
            <p className="text-[#6b6057] mt-1">
              Modere fotos e comentários, gerencie colaboradores e exporte memórias.
            </p>
          </div>
          <Link
            href={`/projects/${project.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Ver galeria
          </Link>
        </div>

        <ProjectAdminClient
          projectId={project.id}
          photos={photos}
          collaborators={collaborators}
          comments={comments}
          hasServiceKey={hasServiceKey}
        />
      </main>
    </AppShell>
  )
}