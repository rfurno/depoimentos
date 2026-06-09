-- ============================================
-- Atomic invite redeem + optional email binding
-- Run after fix-rls-recursion.sql. Safe to re-run.
-- Called only from server (service role) via redeemProjectInvite.
-- ============================================

create or replace function public.redeem_project_invite(
  p_token uuid,
  p_user_id uuid,
  p_user_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.project_invites%rowtype;
  v_project public.projects%rowtype;
  v_claimed_id uuid;
  v_invite_email text;
  v_user_email text;
begin
  select * into v_invite
  from public.project_invites
  where token = p_token;

  if not found then
    return jsonb_build_object('error', 'Convite não encontrado ou inválido.');
  end if;

  if v_invite.redeemed_at is not null then
    return jsonb_build_object(
      'error', 'Este convite já foi utilizado.',
      'project_id', v_invite.project_id,
      'already_member', true
    );
  end if;

  if v_invite.expires_at < now() then
    return jsonb_build_object(
      'error', 'Este convite expirou. Peça um novo link ao proprietário do projeto.'
    );
  end if;

  select * into v_project
  from public.projects
  where id = v_invite.project_id;

  if not found then
    return jsonb_build_object('error', 'Projeto não encontrado.');
  end if;

  if v_project.owner_id = p_user_id then
    return jsonb_build_object(
      'error', 'Você já é o proprietário deste projeto.',
      'project_id', v_project.id,
      'project_title', v_project.title,
      'already_member', true
    );
  end if;

  if exists (
    select 1
    from public.project_collaborators
    where project_id = v_invite.project_id
      and user_id = p_user_id
  ) then
    return jsonb_build_object(
      'error', 'Você já participa deste projeto.',
      'project_id', v_project.id,
      'project_title', v_project.title,
      'already_member', true
    );
  end if;

  v_invite_email := lower(trim(coalesce(v_invite.email, '')));
  v_user_email := lower(trim(coalesce(p_user_email, '')));

  if v_invite_email <> '' and v_user_email <> v_invite_email then
    return jsonb_build_object(
      'error', 'Este convite foi enviado para outro e-mail. Entre com o endereço indicado no convite.'
    );
  end if;

  update public.project_invites
  set
    redeemed_at = now(),
    redeemed_by = p_user_id
  where id = v_invite.id
    and redeemed_at is null
  returning id into v_claimed_id;

  if v_claimed_id is null then
    return jsonb_build_object(
      'error', 'Este convite já foi utilizado.',
      'project_id', v_invite.project_id,
      'already_member', true
    );
  end if;

  insert into public.project_collaborators (project_id, user_id, role)
  values (v_invite.project_id, p_user_id, v_invite.role);

  return jsonb_build_object(
    'project_id', v_project.id,
    'project_title', v_project.title
  );
exception
  when others then
    raise;
end;
$$;

revoke all on function public.redeem_project_invite(uuid, uuid, text) from public;
revoke all on function public.redeem_project_invite(uuid, uuid, text) from anon;
revoke all on function public.redeem_project_invite(uuid, uuid, text) from authenticated;

grant execute on function public.redeem_project_invite(uuid, uuid, text) to service_role;