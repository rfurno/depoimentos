import Link from 'next/link'
import { Plus, Image as ImageIcon } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { ProjectCard } from '@/components/projects/project-card'
import { buttonVariants } from '@/components/ui/button'
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
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl tracking-tighter font-semibold">Seus projetos</h1>
            <p className="text-[#6b6057] mt-1">
              Bem-vindo de volta, {displayName}. Suas histórias de família vivem aqui.
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
          <div className="rounded-2xl border border-[#d9d0c3] bg-white p-16 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f0e9df]">
              <ImageIcon className="h-8 w-8 text-[#8b5e3c]" />
            </div>
            <h3 className="text-2xl tracking-tight font-semibold mb-2">Nenhum projeto ainda</h3>
            <p className="text-[#6b6057] max-w-sm mx-auto mb-8">
              Crie seu primeiro projeto de história familiar. Na Fase 3 você poderá adicionar fotos
              e legendas.
            </p>
            <Link
              href="/projects/new"
              className={buttonVariants({
                size: 'lg',
                className: 'rounded-full px-8 bg-[#8b5e3c] hover:bg-[#6f4a30] text-white',
              })}
            >
              Criar seu primeiro projeto
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}

        <div className="mt-12 text-xs text-center text-[#6b6057]">
          Sessão ativa
        </div>
      </main>
    </AppShell>
  )
}