-- ============================================
-- SECURITY: Comments only on approved photos (owners may comment on any photo)
-- Run after fix-rls-recursion.sql. Safe to re-run.
-- ============================================

drop policy if exists "Collaborators and owners can comment" on public.comments;

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