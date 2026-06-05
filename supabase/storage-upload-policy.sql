-- ============================================
-- Tighten Storage INSERT on private "photos" bucket
-- Default README policy allows any authenticated upload to the bucket.
-- This limits uploads to project folders the user belongs to.
-- Run after fix-rls-recursion.sql
-- ============================================

drop policy if exists "Authenticated users can upload photos" on storage.objects;
drop policy if exists "photos_storage_insert_member" on storage.objects;

create policy "photos_storage_insert_member"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and public.is_project_member((split_part(name, '/', 1))::uuid)
  );