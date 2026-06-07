-- Fix: ERROR 42710 policy "photos_storage_select_member" already exists
-- Run this alone in Supabase SQL Editor, then re-run storage-policies.sql if needed.

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

create policy "photos_storage_select_member"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and public.can_read_photo_storage(name)
  );