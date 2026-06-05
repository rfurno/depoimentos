// This is a stub. 
// After creating your Supabase project and running the schema SQL,
// generate full types with:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > lib/database.types.ts
//
// Then update lib/types.ts to import { Database } from './database.types' and use it for createClient generics.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_collaborators: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          id: string
          project_id: string
          uploaded_by: string
          title: string | null
          caption: string | null
          story: string | null
          image_path: string
          is_approved: boolean
          display_order: number | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          uploaded_by: string
          title?: string | null
          caption?: string | null
          story?: string | null
          image_path: string
          is_approved?: boolean
          display_order?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          uploaded_by?: string
          title?: string | null
          caption?: string | null
          story?: string | null
          image_path?: string
          is_approved?: boolean
          display_order?: number | null
          created_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          photo_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          photo_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          photo_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: { [key: string]: never }
    Functions: { [key: string]: never }
    Enums: { [key: string]: never }
  }
}
