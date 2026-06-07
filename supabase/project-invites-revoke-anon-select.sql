-- ============================================
-- SECURITY: Remove blanket SELECT on project_invites
-- The old policy allowed anon/authenticated to list ALL invite tokens.
-- Invite lookup/redemption uses SUPABASE_SERVICE_ROLE_KEY server-side only.
-- Safe to re-run.
-- ============================================

drop policy if exists "Anyone with valid token can read invite (for redemption)" on public.project_invites;

-- Owners retain full access via "Owners manage invites" (for all).
-- No additional SELECT policy for anon/authenticated.