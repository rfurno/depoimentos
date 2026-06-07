import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MAX_EXPORT_PHOTOS } from '@/lib/export/constants'
import { buildProjectExportZip } from '@/lib/export/build-zip'
import { checkExportRateLimit } from '@/lib/export/rate-limit'
import { getProjectAccess } from '@/lib/projects/queries'
import { parseUuid } from '@/lib/validation/uuid'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params
  const projectUuid = parseUuid(id)
  if (!projectUuid) {
    return NextResponse.json({ error: 'Projeto inválido.' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const access = await getProjectAccess(projectUuid, user.id)
  if (!access?.isOwner) {
    return NextResponse.json({ error: 'Apenas o proprietário pode exportar.' }, { status: 403 })
  }

  const rateLimit = checkExportRateLimit(user.id)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Limite de exportações atingido. Tente novamente em ${rateLimit.retryAfterSec ?? 60} segundos.`,
      },
      { status: 429 }
    )
  }

  const { searchParams } = new URL(request.url)
  const rawIds = searchParams.get('photoIds')
  const photoIds = rawIds
    ? rawIds
        .split(',')
        .map((s) => parseUuid(s.trim()))
        .filter((x): x is string => Boolean(x))
    : undefined

  if (photoIds && photoIds.length > MAX_EXPORT_PHOTOS) {
    return NextResponse.json(
      { error: `Máximo de ${MAX_EXPORT_PHOTOS} fotos por exportação.` },
      { status: 400 }
    )
  }

  const result = await buildProjectExportZip(projectUuid, photoIds)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}