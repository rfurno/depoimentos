-- ============================================
-- SECURITY: Comments on approved photos only (owners may read/comment on any photo)
-- Run after fix-rls-recursion.sql. Safe to re-run.
-- ============================================

drop policy if exists "Collaborators and owners can comment" on public.comments;
drop policy if exists "View comments if you can view the photo" on public.comments;
drop policy if exists "comments_select_approved_photo" on public.comments;
drop policy if exists "comments_insert_approved_photo" on public.comments;

create policy "comments_select_approved_photo"
  on public.comments for select to authenticated
  using (
    exists (
      select 1
      from public.photos p
      where p.id = photo_id
        and (
          public.is_project_owner(p.project_id)
          or (p.is_approved = true and public.is_project_member(p.project_id))
        )
    )
  );

create policy "comments_insert_approved_photo"
  on public.comments for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.photos p
      where p.id = photo_id
        and (
          public.is_project_owner(p.project_id)
          or (p.is_approved = true and public.is_project_member(p.project_id))
        )
    )
  );