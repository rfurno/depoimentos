import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ExportMemory } from '@/lib/types'

type ProjectMeta = {
  title: string
  description: string | null
  exported_at: string
}

export function buildMemoriesMarkdown(
  project: ProjectMeta,
  memories: ExportMemory[]
): string {
  const lines: string[] = [
    `# ${project.title}`,
    '',
    `Exportado em ${format(new Date(project.exported_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`,
    '',
  ]

  if (project.description?.trim()) {
    lines.push('## Sobre o projeto', '', project.description.trim(), '')
  }

  lines.push(
    '## Memórias',
    '',
    'Este arquivo foi gerado pelo Storyloom para você colar em um assistente de IA e criar uma narrativa familiar.',
    ''
  )

  for (let i = 0; i < memories.length; i++) {
    const m = memories[i]
    const heading = m.title?.trim() || `Foto ${i + 1}`
    lines.push(`### ${i + 1}. ${heading}`, '')
    lines.push(`- **Arquivo:** \`${m.image_filename}\``)
    if (m.uploaded_by_name) lines.push(`- **Enviado por:** ${m.uploaded_by_name}`)
    lines.push(
      `- **Data:** ${format(new Date(m.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`
    )
    if (m.caption?.trim()) {
      lines.push('', '**Legenda:**', '', m.caption.trim())
    }
    if (m.story?.trim()) {
      lines.push('', '**História:**', '', m.story.trim())
    }
    if (m.comments.length > 0) {
      lines.push('', '**Comentários:**', '')
      for (const c of m.comments) {
        const when = format(new Date(c.created_at), "d MMM yyyy", { locale: ptBR })
        lines.push(`- **${c.author_name ?? 'Familiar'}** (${when}): ${c.content}`)
      }
    }
    lines.push('', '---', '')
  }

  return lines.join('\n').trimEnd() + '\n'
}