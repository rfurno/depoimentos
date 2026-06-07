-- ============================================
-- Tighten Storage INSERT on private "photos" bucket
-- Contributors/admins/owners only (viewers cannot upload orphan objects).
-- Run after fix-rls-recursion.sql (needs can_contribute_to_project)
-- ============================================

drop policy if exists "Authenticated users can upload photos" on storage.objects;
drop policy if exists "photos_storage_insert_member" on storage.objects;

create policy "photos_storage_insert_member"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and public.can_contribute_to_project((split_part(name, '/', 1))::uuid)
  );