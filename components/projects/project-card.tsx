import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FolderOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { roleLabel } from '@/lib/projects/labels'
import type { ProjectWithRole } from '@/lib/types'

type ProjectCardProps = {
  project: ProjectWithRole
}

export function ProjectCard({ project }: ProjectCardProps) {
  const updatedAgo = formatDistanceToNow(new Date(project.updated_at), {
    addSuffix: true,
    locale: ptBR,
  })

  return (
    <Link
      href={`/projects/${project.id}`}
      className="story-card group block rounded-2xl border border-border bg-card p-6 card-elevated hover:border-brand/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl icon-tile transition group-hover:scale-105">
          <FolderOpen className="h-5 w-5" />
        </div>
        <Badge variant="secondary" className="bg-bg-subtle text-text-secondary border-0">
          {roleLabel(project.role)}
        </Badge>
      </div>

      <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground group-hover:text-brand transition-colors">
        {project.title}
      </h3>

      {project.description ? (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
      ) : (
        <p className="mt-2 text-sm italic text-muted-foreground/80">Sem descrição ainda</p>
      )}

      <p className="mt-4 text-xs text-muted-foreground">Atualizado {updatedAgo}</p>
    </Link>
  )
}