import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { ProjectForm } from '@/components/projects/project-form'
import { requireUser } from '@/lib/auth/server'
import { getDisplayName, getProjectAccess } from '@/lib/projects/queries'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditProjectPage({ params }: PageProps) {
  const { id } = await params
  const user = await requireUser()
  const [displayName, access] = await Promise.all([
    getDisplayName(user.id, user.email),
    getProjectAccess(id, user.id),
  ])

  if (!access) {
    notFound()
  }

  if (!access.isOwner) {
    redirect(`/projects/${id}`)
  }

  const { project } = access

  return (
    <AppShell displayName={displayName}>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center text-sm text-[#6b6057] hover:text-[#2c2522] mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao projeto
        </Link>
        <div className="flex justify-center">
          <ProjectForm
            mode="edit"
            projectId={project.id}
            defaultValues={{
              title: project.title,
              description: project.description ?? '',
            }}
          />
        </div>
      </main>
    </AppShell>
  )
}