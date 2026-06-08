import Link from 'next/link'
import { Plus, FolderOpen } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { ProjectCard } from '@/components/projects/project-card'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { requireUser } from '@/lib/auth/server'
import { getDisplayName, getProjectsForUser } from '@/lib/projects/queries'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await requireUser()
  const [displayName, projects] = await Promise.all([
    getDisplayName(user.id, user.email),
    getProjectsForUser(user.id),
  ])

  return (
    <AppShell displayName={displayName}>
      <main className="page-container">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl tracking-tighter font-semibold">Seus projetos</h1>
            <p className="text-muted-foreground mt-1">
              Bem-vindo de volta, {displayName}. Suas histórias de família vivem aqui.
            </p>
          </div>
          <Link
            href="/projects/new"
            className={buttonVariants({
              className: 'btn-primary-gradient rounded-full font-semibold px-5 text-white shrink-0',
            })}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Projeto
          </Link>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="Nenhum projeto ainda"
            description="Crie seu primeiro projeto de história familiar. Depois adicione fotos, convide parentes e preserve memórias juntos."
          >
            <Link
              href="/projects/new"
              className={buttonVariants({
                size: 'lg',
                className: 'rounded-full px-8 btn-primary-gradient font-semibold w-full sm:w-auto',
              })}
            >
              Criar seu primeiro projeto
            </Link>
          </EmptyState>
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