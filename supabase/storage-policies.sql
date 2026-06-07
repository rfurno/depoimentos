-- ============================================
-- Storyloom Storage policies (photos bucket) — run all in order
-- 1. fix-rls-recursion.sql (public.is_project_* helpers)
-- 2. This file (or run the individual storage-*.sql files)
--
-- If you get "policy ... already exists": run storage-reset-select-policy.sql
-- or the DROP line for that policy, then run this file again.
-- Do NOT run storage-policies.sql AND storage-read-policy.sql — they duplicate SELECT.
-- ============================================

-- Helper: owners read all project objects; members only approved photo paths
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

-- INSERT: contributors/admins/owners only (not viewers)
drop policy if exists "Authenticated users can upload photos" on storage.objects;
drop policy if exists "photos_storage_insert_member" on storage.objects;

create policy "photos_storage_insert_member"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and public.can_contribute_to_project((split_part(name, '/', 1))::uuid)
  );

-- SELECT: aligned with photo approval (owners see all; members see approved only)
drop policy if exists "photos_storage_select_member" on storage.objects;

create policy "photos_storage_select_member"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and public.can_read_photo_storage(name)
  );

-- UPDATE: only the uploader (for upsert/replace flows)
drop policy if exists "Authenticated can update/delete own uploaded objects (enforce in app)" on storage.objects;
drop policy if exists "photos_storage_update_uploader" on storage.objects;

create policy "photos_storage_update_uploader"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'photos'
    and owner_id = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'photos'
    and owner_id = (select auth.uid()::text)
    and public.is_project_member((split_part(name, '/', 1))::uuid)
  );

-- DELETE: project owner OR original uploader
drop policy if exists "Authenticated can delete objects (enforce via photos RLS + server actions)" on storage.objects;
drop policy if exists "photos_storage_delete_owner_or_uploader" on storage.objects;

create policy "photos_storage_delete_owner_or_uploader"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos'
    and (
      public.is_project_owner((split_part(name, '/', 1))::uuid)
      or owner_id = (select auth.uid()::text)
    )
  );