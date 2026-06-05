-- ============================================
-- Storyloom Storage policies (photos bucket) — run all in order
-- 1. fix-rls-recursion.sql (public.is_project_* helpers)
-- 2. This file (or run the individual storage-*.sql files)
-- ============================================

-- INSERT: members of the project may upload into that project's folder
drop policy if exists "Authenticated users can upload photos" on storage.objects;
drop policy if exists "photos_storage_insert_member" on storage.objects;

create policy "photos_storage_insert_member"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and public.is_project_member((split_part(name, '/', 1))::uuid)
  );

-- SELECT: members may read objects (optional if you use service role signed URLs only)
drop policy if exists "photos_storage_select_member" on storage.objects;

create policy "photos_storage_select_member"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and public.is_project_member((split_part(name, '/', 1))::uuid)
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