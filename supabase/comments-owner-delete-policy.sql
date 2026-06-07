-- Allow project owners to moderate (delete) any comment on their project's photos.
-- Run once in Supabase SQL Editor after comments-mutate-policies.sql.

drop policy if exists "comments_delete_project_owner" on public.comments;

create policy "comments_delete_project_owner"
  on public.comments for delete to authenticated
  using (
    exists (
      select 1 from public.photos p
      join public.projects pr on pr.id = p.project_id
      where p.id = photo_id and pr.owner_id = (select auth.uid())
    )
  );