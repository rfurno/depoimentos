import { AppShell } from '@/components/layout/app-shell'
import { ProjectForm } from '@/components/projects/project-form'
import { requireUser } from '@/lib/auth/server'
import { getDisplayName } from '@/lib/projects/queries'

export const dynamic = 'force-dynamic'

export default async function NewProjectPage() {
  const user = await requireUser()
  const displayName = await getDisplayName(user.id, user.email)

  return (
    <AppShell displayName={displayName}>
      <main className="mx-auto max-w-5xl px-6 py-12 flex justify-center">
        <ProjectForm mode="create" />
      </main>
    </AppShell>
  )
}