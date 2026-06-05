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
      className="group block rounded-2xl border border-[#d9d0c3] bg-white p-6 shadow-sm transition hover:border-[#8b5e3c]/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f0e9df] text-[#8b5e3c] transition group-hover:bg-[#e8dfd3]">
          <FolderOpen className="h-5 w-5" />
        </div>
        <Badge variant="secondary" className="bg-[#f0e9df] text-[#6b6057] border-0">
          {roleLabel(project.role)}
        </Badge>
      </div>

      <h3 className="mt-4 text-xl font-semibold tracking-tight text-[#2c2522] group-hover:text-[#8b5e3c]">
        {project.title}
      </h3>

      {project.description ? (
        <p className="mt-2 line-clamp-2 text-sm text-[#6b6057]">{project.description}</p>
      ) : (
        <p className="mt-2 text-sm italic text-[#6b6057]/80">Sem descrição ainda</p>
      )}

      <p className="mt-4 text-xs text-[#6b6057]">Atualizado {updatedAgo}</p>
    </Link>
  )
}