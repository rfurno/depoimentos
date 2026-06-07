-- ============================================
-- SECURITY: Storage SELECT/INSERT aligned with photo approval + contributor role
-- Run after fix-rls-recursion.sql (is_project_owner, is_project_member, can_contribute_to_project).
-- Safe to re-run.
-- ============================================

-- Owners: any object under their project folder.
-- Members: only objects linked to an approved photo row.
create or replace function public.can_read_photo_storage(object_path text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_project_owner((split_part(object_path, '/', 1))::uuid)
    or exists (
      select 1
      from public.photos p
      where p.image_path = object_path
        and p.is_approved = true
        and public.is_project_member(p.project_id)
    );
$$;

grant execute on function public.can_read_photo_storage(text) to authenticated;

drop policy if exists "photos_storage_select_member" on storage.objects;
drop policy if exists "Authenticated users can upload photos" on storage.objects;
drop policy if exists "photos_storage_insert_member" on storage.objects;

create policy "photos_storage_select_member"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and public.can_read_photo_storage(name)
  );

create policy "photos_storage_insert_member"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and public.can_contribute_to_project((split_part(name, '/', 1))::uuid)
  );