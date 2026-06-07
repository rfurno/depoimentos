'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { projectMutationError } from '@/lib/supabase/errors'
import { MAX_COMMENT_LENGTH } from '@/lib/comments/constants'
import {
  getCommentsForPhoto,
  type CommentWithAuthor,
} from '@/lib/comments/queries'
import { getProjectAccess } from '@/lib/projects/queries'
import { parseUuid } from '@/lib/validation/uuid'

const commentContentSchema = z
  .string()
  .trim()
  .min(1, 'Escreva um comentário.')
  .max(MAX_COMMENT_LENGTH, `Máximo de ${MAX_COMMENT_LENGTH} caracteres.`)

export type CommentActionState = {
  error?: string
}

export type FetchCommentsResult = {
  comments?: CommentWithAuthor[]
  error?: string
}

async function assertPhotoInProject(
  projectId: string,
  photoId: string,
  userId: string
): Promise<{ error: string } | { projectUuid: string; photoUuid: string }> {
  const projectUuid = parseUuid(projectId)
  const photoUuid = parseUuid(photoId)
  if (!projectUuid || !photoUuid) {
    return { error: 'Identificador inválido.' }
  }

  const access = await getProjectAccess(projectUuid, userId)
  if (!access) return { error: 'Projeto não encontrado.' }

  const supabase = await createClient()
  const { data: photo } = await supabase
    .from('photos')
    .select('id, is_approved')
    .eq('id', photoUuid)
    .eq('project_id', projectUuid)
    .maybeSingle()

  if (!photo) return { error: 'Foto não encontrada.' }

  if (!access.isOwner && !photo.is_approved) {
    return { error: 'Esta foto ainda não foi aprovada para comentários.' }
  }

  return { projectUuid, photoUuid }
}

export async function fetchPhotoComments(
  projectId: string,
  photoId: string,
  currentUserDisplayName: string
): Promise<FetchCommentsResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar conectado.' }

  const check = await assertPhotoInProject(projectId, photoId, user.id)
  if ('error' in check) return { error: check.error }

  const comments = await getCommentsForPhoto(
    projectId,
    photoId,
    user.id,
    currentUserDisplayName
  )
  return { comments }
}

export async function addComment(
  projectId: string,
  photoId: string,
  content: string,
  currentUserDisplayName: string
): Promise<FetchCommentsResult> {
  const parsed = commentContentSchema.safeParse(content)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Comentário inválido.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar conectado.' }

  const check = await assertPhotoInProject(projectId, photoId, user.id)
  if ('error' in check) return { error: check.error }

  const { error } = await supabase.from('comments').insert({
    photo_id: check.photoUuid,
    user_id: user.id,
    content: parsed.data,
  })

  if (error) {
    return { error: projectMutationError('addComment', error) }
  }

  revalidatePath(`/projects/${check.projectUuid}`)
  const comments = await getCommentsForPhoto(
    projectId,
    photoId,
    user.id,
    currentUserDisplayName
  )
  return { comments }
}

export async function updateComment(
  projectId: string,
  photoId: string,
  commentId: string,
  content: string,
  currentUserDisplayName: string
): Promise<FetchCommentsResult> {
  const parsed = commentContentSchema.safeParse(content)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Comentário inválido.' }
  }

  const commentUuid = parseUuid(commentId)
  if (!commentUuid) return { error: 'Comentário inválido.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar conectado.' }

  const check = await assertPhotoInProject(projectId, photoId, user.id)
  if ('error' in check) return { error: check.error }

  const { error } = await supabase
    .from('comments')
    .update({ content: parsed.data })
    .eq('id', commentUuid)
    .eq('photo_id', check.photoUuid)
    .eq('user_id', user.id)

  if (error) {
    return { error: projectMutationError('updateComment', error) }
  }

  revalidatePath(`/projects/${check.projectUuid}`)
  const comments = await getCommentsForPhoto(
    projectId,
    photoId,
    user.id,
    currentUserDisplayName
  )
  return { comments }
}

export async function deleteComment(
  projectId: string,
  photoId: string,
  commentId: string,
  currentUserDisplayName: string
): Promise<FetchCommentsResult> {
  const commentUuid = parseUuid(commentId)
  if (!commentUuid) return { error: 'Comentário inválido.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar conectado.' }

  const check = await assertPhotoInProject(projectId, photoId, user.id)
  if ('error' in check) return { error: check.error }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentUuid)
    .eq('photo_id', check.photoUuid)
    .eq('user_id', user.id)

  if (error) {
    return { error: projectMutationError('deleteComment', error) }
  }

  revalidatePath(`/projects/${check.projectUuid}`)
  const comments = await getCommentsForPhoto(
    projectId,
    photoId,
    user.id,
    currentUserDisplayName
  )
  return { comments }
}