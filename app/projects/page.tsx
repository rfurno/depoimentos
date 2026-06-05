import Link from 'next/link'
import { Plus } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { ProjectCard } from '@/components/projects/project-card'
import { buttonVariants } from '@/components/ui/button'
import { requireUser } from '@/lib/auth/server'
import { getDisplayName, getProjectsForUser } from '@/lib/projects/queries'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const user = await requireUser()
  const [displayName, projects] = await Promise.all([
    getDisplayName(user.id, user.email),
    getProjectsForUser(user.id),
  ])

  return (
    <AppShell displayName={displayName}>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl tracking-tight font-semibold">Todos os projetos</h1>
            <p className="text-[#6b6057] mt-1">
              Projetos que você criou ou nos quais colabora.
            </p>
          </div>
          <Link
            href="/projects/new"
            className={buttonVariants({
              className: 'rounded-full bg-[#8b5e3c] hover:bg-[#6f4a30] px-5 text-white shrink-0',
            })}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Projeto
          </Link>
        </div>

        {projects.length === 0 ? (
          <p className="text-[#6b6057] text-center py-12">
            Nenhum projeto encontrado.{' '}
            <Link href="/projects/new" className="text-[#8b5e3c] underline">
              Criar um agora
            </Link>
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </AppShell>
  )
}