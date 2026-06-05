-- ============================================
-- FIX: infinite recursion in RLS (projects ↔ project_collaborators)
-- Safe to re-run: drops old + new policy names before CREATE.
-- Error symptom: "infinite recursion detected in policy for relation projects"
-- ============================================

-- Security definer helpers bypass RLS when checking membership (no policy loops).
create or replace function public.is_project_owner(project_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.projects
    where id = project_uuid and owner_id = (select auth.uid())
  );
$$;

create or replace function public.is_project_collaborator(project_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.project_collaborators
    where project_id = project_uuid and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_project_member(project_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_project_owner(project_uuid)
      or public.is_project_collaborator(project_uuid);
$$;

create or replace function public.can_contribute_to_project(project_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_project_owner(project_uuid)
      or exists (
        select 1 from public.project_collaborators
        where project_id = project_uuid
          and user_id = (select auth.uid())
          and role in ('contributor', 'admin')
      );
$$;

grant execute on function public.is_project_owner(uuid) to authenticated;
grant execute on function public.is_project_collaborator(uuid) to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.can_contribute_to_project(uuid) to authenticated;

-- ---- PROJECTS ----
drop policy if exists "Owners can do everything on their projects" on public.projects;
drop policy if exists "Collaborators can view projects they belong to" on public.projects;
drop policy if exists "projects_insert_owner" on public.projects;
drop policy if exists "projects_select_owner" on public.projects;
drop policy if exists "projects_update_owner" on public.projects;
drop policy if exists "projects_delete_owner" on public.projects;
drop policy if exists "projects_select_collaborator" on public.projects;

create policy "projects_insert_owner"
  on public.projects for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "projects_select_owner"
  on public.projects for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "projects_update_owner"
  on public.projects for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "projects_delete_owner"
  on public.projects for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "projects_select_collaborator"
  on public.projects for select to authenticated
  using (public.is_project_collaborator(id));

-- ---- PROJECT_COLLABORATORS ----
drop policy if exists "Owners manage collaborators" on public.project_collaborators;
drop policy if exists "Collaborators can view other collaborators in same project" on public.project_collaborators;
drop policy if exists "collaborators_owner_manage" on public.project_collaborators;
drop policy if exists "collaborators_select_member" on public.project_collaborators;

create policy "collaborators_owner_manage"
  on public.project_collaborators for all to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

create policy "collaborators_select_member"
  on public.project_collaborators for select to authenticated
  using (public.is_project_collaborator(project_id));

-- ---- PHOTOS (optional but recommended — same recursion pattern) ----
drop policy if exists "View approved photos if collaborator or owner" on public.photos;
drop policy if exists "Owners can view all photos (incl unapproved)" on public.photos;
drop policy if exists "Contributors and owners can insert photos" on public.photos;
drop policy if exists "Owners + uploader can update their photos" on public.photos;
drop policy if exists "Owners can delete photos" on public.photos;
drop policy if exists "photos_select_approved_member" on public.photos;
drop policy if exists "photos_select_owner_all" on public.photos;
drop policy if exists "photos_insert_contributor" on public.photos;
drop policy if exists "photos_update_owner_or_uploader" on public.photos;
drop policy if exists "photos_delete_owner" on public.photos;

create policy "photos_select_approved_member"
  on public.photos for select to authenticated
  using (
    is_approved = true and public.is_project_member(project_id)
  );

create policy "photos_select_owner_all"
  on public.photos for select to authenticated
  using (public.is_project_owner(project_id));

create policy "photos_insert_contributor"
  on public.photos for insert to authenticated
  with check (
    (select auth.uid()) = uploaded_by
    and public.can_contribute_to_project(project_id)
  );

create policy "photos_update_owner_or_uploader"
  on public.photos for update to authenticated
  using (
    public.is_project_owner(project_id)
    or (select auth.uid()) = uploaded_by
  );

create policy "photos_delete_owner"
  on public.photos for delete to authenticated
  using (public.is_project_owner(project_id));