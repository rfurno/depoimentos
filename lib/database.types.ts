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
      // Add other tables as needed after generation. For now use the manual interfaces in lib/types.ts
      [key: string]: unknown
    }
    Views: { [key: string]: never }
    Functions: { [key: string]: never }
    Enums: { [key: string]: never }
  }
}
