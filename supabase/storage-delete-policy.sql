-- ============================================
-- Storage DELETE for private "photos" bucket
-- Replaces the permissive "any authenticated user can delete" policy.
--
-- Who can delete a storage object:
--   1. Project owner (any file under their project folder)
--   2. The user who uploaded the file (storage.objects.owner_id)
--
-- Path format: {project_id}/{file_id}.ext
-- Run after: fix-rls-recursion.sql
-- ============================================

drop policy if exists "Authenticated can delete objects (enforce via photos RLS + server actions)" on storage.objects;
drop policy if exists "photos_storage_delete_owner_or_uploader" on storage.objects;

create policy "photos_storage_delete_owner_or_uploader"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos'
    and (
      -- Project owner may remove any photo in their project folder
      public.is_project_owner((split_part(name, '/', 1))::uuid)
      -- Uploader may remove files they uploaded (owner_id set by Supabase on INSERT)
      or owner_id = (select auth.uid()::text)
    )
  );