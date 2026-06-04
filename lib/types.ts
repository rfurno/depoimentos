import type { Database as GeneratedDatabase } from './database.types'

// Re-export or extend Database type. For MVP we define inline shapes below + use Generated if present.
// After `supabase gen types`, you can enhance queries with full generated types.
export type Database = GeneratedDatabase

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Core DB row types matching our schema (manual for bootstrap; replace with generated)
export interface Profile {
  id: string // uuid, matches auth.users.id
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  owner_id: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
}

export type CollaboratorRole = 'contributor' | 'viewer' | 'admin'

export interface ProjectCollaborator {
  id: string
  project_id: string
  user_id: string
  role: CollaboratorRole
  created_at: string
  // joined profile
  profile?: Profile
}

export interface Photo {
  id: string
  project_id: string
  uploaded_by: string
  title: string | null
  caption: string | null
  story: string | null
  image_path: string // path in Supabase Storage bucket 'photos'
  is_approved: boolean
  display_order: number | null
  created_at: string
  // relations
  uploader?: Profile
  comment_count?: number
}

export interface Comment {
  id: string
  photo_id: string
  user_id: string
  content: string
  created_at: string
  // relations
  user?: Profile
}

export type InviteRole = 'contributor' | 'viewer' | 'admin'

export interface ProjectInvite {
  id: string
  project_id: string
  token: string // uuid
  email: string | null // optional prefill
  role: InviteRole
  expires_at: string
  redeemed_at: string | null
  redeemed_by: string | null
  created_by: string
  created_at: string
}

// Extended / UI-friendly types
export interface ProjectWithRole extends Project {
  role: CollaboratorRole | 'owner'
  collaborator_count?: number
  photo_count?: number
  cover_photo?: Photo | null
}

export interface PhotoWithComments extends Photo {
  comments: Comment[]
}

export interface User {
  id: string
  email?: string
  full_name?: string | null
  avatar_url?: string | null
}

// For export ZIP structure
export interface ExportMemory {
  id: string
  title: string | null
  caption: string | null
  story: string | null
  image_filename: string
  uploaded_by_name: string | null
  created_at: string
  comments: Array<{
    author_name: string | null
    content: string
    created_at: string
  }>
}

// Auth related
export interface MagicLinkState {
  loading: boolean
  error: string | null
  success: boolean
}

// Future audio support placeholders (schema + UI ready)
export interface AudioComment {
  id: string
  photo_id: string
  user_id: string
  audio_path: string
  duration_seconds: number | null
  transcript: string | null
  created_at: string
}

// Utility
export type Role = CollaboratorRole | 'owner'
