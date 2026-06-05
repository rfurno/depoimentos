-- ============================================
-- Storage SELECT for private "photos" bucket (optional if using service role for signed URLs)
-- Run after fix-rls-recursion.sql (needs is_project_member)
-- Path format: {project_id}/{filename}
-- ============================================

drop policy if exists "photos_storage_select_member" on storage.objects;

create policy "photos_storage_select_member"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and public.is_project_member((split_part(name, '/', 1))::uuid)
  );