-- Idempotent: allow users to edit/delete their own comments
drop policy if exists "comments_update_own" on public.comments;
drop policy if exists "comments_delete_own" on public.comments;

create policy "comments_update_own"
  on public.comments for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "comments_delete_own"
  on public.comments for delete to authenticated
  using ((select auth.uid()) = user_id);