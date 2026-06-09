'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireProjectOwner } from '@/lib/admin/permissions'
import { projectMutationError } from '@/lib/supabase/errors'
import { getProjectAccess } from '@/lib/projects/queries'
import { parseUuid } from '@/lib/validation/uuid'
import type { CollaboratorRole } from '@/lib/types'

export type AdminActionState = {
  error?: string
}

const photoMetaSchema = z.object({
  title: z.string().trim().max(200).optional(),
  caption: z.string().trim().max(500).optional(),
  story: z.string().trim().max(5000).optional(),
})

const collaboratorRoleSchema = z.enum(['contributor', 'viewer', 'admin'])

async function assertOwner(projectId: string, userId: string) {
  const id = parseUuid(projectId)
  if (!id) return { error: 'Projeto inválido.' as const }
  const access = await getProjectAccess(id, userId)
  if (!requireProjectOwner(access)) {
    return { error: 'Apenas o proprietário pode fazer isso.' as const }
  }
  return { projectUuid: id, access }
}

export async function setPhotoApproval(
  projectId: string,
  photoId: string,
  isApproved: boolean
): Promise<AdminActionState> {
  const photoUuid = parseUuid(photoId)
  if (!photoUuid) return { error: 'Foto inválida.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar conectado.' }

  const check = await assertOwner(projectId, user.id)
  if ('error' in check) return check

  const { error } = await supabase
    .from('photos')
    .update({ is_approved: isApproved })
    .eq('id', photoUuid)
    .eq('project_id', check.projectUuid)

  if (error) return { error: projectMutationError('setPhotoApproval', error) }

  revalidatePath(`/projects/${check.projectUuid}`)
  revalidatePath(`/projects/${check.projectUuid}/admin`)
  return {}
}

export async function updatePhotoMetadata(
  projectId: string,
  photoId: string,
  fields: { title?: string; caption?: string; story?: string }
): Promise<AdminActionState> {
  const photoUuid = parseUuid(photoId)
  if (!photoUuid) return { error: 'Foto inválida.' }

  const parsed = photoMetaSchema.safeParse(fields)
  if (!parsed.success) return { error: 'Dados inválidos.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar conectado.' }

  const check = await assertOwner(projectId, user.id)
  if ('error' in check) return check

  const { error } = await supabase
    .from('photos')
    .update({
      title: parsed.data.title || null,
      caption: parsed.data.caption || null,
      story: parsed.data.story || null,
    })
    .eq('id', photoUuid)
    .eq('project_id', check.projectUuid)

  if (error) return { error: projectMutationError('updatePhotoMetadata', error) }

  revalidatePath(`/projects/${check.projectUuid}`)
  revalidatePath(`/projects/${check.projectUuid}/admin`)
  return {}
}

export async function deleteCommentAsOwner(
  projectId: string,
  commentId: string
): Promise<AdminActionState> {
  const commentUuid = parseUuid(commentId)
  if (!commentUuid) return { error: 'Comentário inválido.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar conectado.' }

  const check = await assertOwner(projectId, user.id)
  if ('error' in check) return check

  const { data: comment } = await supabase
    .from('comments')
    .select('id, photo_id')
    .eq('id', commentUuid)
    .maybeSingle()

  if (!comment) return { error: 'Comentário não encontrado.' }

  const { data: photo } = await supabase
    .from('photos')
    .select('project_id')
    .eq('id', comment.photo_id)
    .maybeSingle()

  if (!photo || photo.project_id !== check.projectUuid) {
    return { error: 'Comentário não encontrado neste projeto.' }
  }

  const { error } = await supabase.from('comments').delete().eq('id', commentUuid)

  if (error) return { error: projectMutationError('deleteCommentAsOwner', error) }

  revalidatePath(`/projects/${check.projectUuid}`)
  revalidatePath(`/projects/${check.projectUuid}/admin`)
  return {}
}

export async function updateCollaboratorRole(
  projectId: string,
  collaboratorId: string,
  role: CollaboratorRole
): Promise<AdminActionState> {
  const collabUuid = parseUuid(collaboratorId)
  if (!collabUuid) return { error: 'Colaborador inválido.' }

  const parsedRole = collaboratorRoleSchema.safeParse(role)
  if (!parsedRole.success) return { error: 'Papel inválido.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar conectado.' }

  const check = await assertOwner(projectId, user.id)
  if ('error' in check) return check

  const { error } = await supabase
    .from('project_collaborators')
    .update({ role: parsedRole.data })
    .eq('id', collabUuid)
    .eq('project_id', check.projectUuid)

  if (error) return { error: projectMutationError('updateCollaboratorRole', error) }

  revalidatePath(`/projects/${check.projectUuid}`)
  revalidatePath(`/projects/${check.projectUuid}/admin`)
  return {}
}

/** Owner: add someone who already collaborates on another project you own. */
export async function addExistingCollaborator(
  projectId: string,
  memberUserId: string,
  role: CollaboratorRole
): Promise<AdminActionState> {
  const memberUuid = parseUuid(memberUserId)
  if (!memberUuid) return { error: 'Pessoa inválida.' }

  const parsedRole = collaboratorRoleSchema.safeParse(role)
  if (!parsedRole.success) return { error: 'Papel inválido.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar conectado.' }

  const check = await assertOwner(projectId, user.id)
  if ('error' in check) return check

  if (memberUuid === user.id) {
    return { error: 'Você já é o proprietário deste projeto.' }
  }

  const { data: alreadyMember } = await supabase
    .from('project_collaborators')
    .select('id')
    .eq('project_id', check.projectUuid)
    .eq('user_id', memberUuid)
    .maybeSingle()

  if (alreadyMember) {
    return { error: 'Esta pessoa já participa deste projeto.' }
  }

  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', user.id)

  const ownedIds = (ownedProjects ?? [])
    .map((p) => p.id)
    .filter((id) => id !== check.projectUuid)

  if (ownedIds.length === 0) {
    return { error: 'Não há outros projetos seus com colaboradores registrados.' }
  }

  const { data: networkMembership } = await supabase
    .from('project_collaborators')
    .select('id')
    .in('project_id', ownedIds)
    .eq('user_id', memberUuid)
    .limit(1)
    .maybeSingle()

  if (!networkMembership) {
    return {
      error: 'Esta pessoa precisa já participar de outro projeto seu (com conta registrada).',
    }
  }

  const { error } = await supabase.from('project_collaborators').insert({
    project_id: check.projectUuid,
    user_id: memberUuid,
    role: parsedRole.data,
  })

  if (error) return { error: projectMutationError('addExistingCollaborator', error) }

  revalidatePath(`/projects/${check.projectUuid}`)
  revalidatePath(`/projects/${check.projectUuid}/admin`)
  return {}
}

export async function removeCollaborator(
  projectId: string,
  collaboratorId: string
): Promise<AdminActionState> {
  const collabUuid = parseUuid(collaboratorId)
  if (!collabUuid) return { error: 'Colaborador inválido.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar conectado.' }

  const check = await assertOwner(projectId, user.id)
  if ('error' in check) return check

  const { data: row } = await supabase
    .from('project_collaborators')
    .select('user_id')
    .eq('id', collabUuid)
    .eq('project_id', check.projectUuid)
    .maybeSingle()

  if (!row) return { error: 'Colaborador não encontrado.' }
  if (row.user_id === user.id) {
    return { error: 'Você não pode remover a si mesmo como proprietário.' }
  }

  const { error } = await supabase
    .from('project_collaborators')
    .delete()
    .eq('id', collabUuid)
    .eq('project_id', check.projectUuid)

  if (error) return { error: projectMutationError('removeCollaborator', error) }

  revalidatePath(`/projects/${check.projectUuid}`)
  revalidatePath(`/projects/${check.projectUuid}/admin`)
  return {}
}