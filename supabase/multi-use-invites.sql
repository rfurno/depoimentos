-- ============================================
-- Multi-use invite links + display name on redeem
-- Run after invite-people-phase1.sql. Safe to re-run.
-- ============================================
-- Links without a bound email can be shared with many people.
-- Each redeemer joins as a collaborator; optional display name is stored on profiles.
-- Email-bound invites remain single-use.

-- Default false so already-redeemed historical invites stay closed after migrate
alter table public.project_invites
  add column if not exists multi_use boolean not null default false;

-- Pending open links (no email, not yet used) become multi-use family links
update public.project_invites
set multi_use = true
where (email is null or trim(email) = '')
  and redeemed_at is null;

-- Email-bound or already-used invites remain single-use
update public.project_invites
set multi_use = false
where (email is not null and trim(email) <> '')
   or redeemed_at is not null;

drop function if exists public.redeem_project_invite(uuid, uuid, text, text);
drop function if exists public.redeem_project_invite(uuid, uuid, text, text, text);

create or replace function public.redeem_project_invite(
  p_token uuid,
  p_user_id uuid,
  p_user_email text,
  p_phone text default null,
  p_display_name text default null
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
  v_phone text;
  v_display_name text;
  v_is_multi boolean;
begin
  select * into v_invite
  from public.project_invites
  where token = p_token;

  if not found then
    return jsonb_build_object('error', 'Convite não encontrado ou inválido.');
  end if;

  v_is_multi := coalesce(v_invite.multi_use, false);

  -- Single-use only: block after first successful redeem
  if not v_is_multi and v_invite.redeemed_at is not null then
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

  if v_is_multi then
    -- Multi-use: join without consuming the link
    insert into public.project_collaborators (project_id, user_id, role, invite_id)
    values (v_invite.project_id, p_user_id, v_invite.role, v_invite.id);
  else
    -- Single-use: atomic claim then insert collaborator
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

    insert into public.project_collaborators (project_id, user_id, role, invite_id)
    values (v_invite.project_id, p_user_id, v_invite.role, v_invite.id);
  end if;

  v_phone := nullif(trim(coalesce(p_phone, '')), '');
  if v_phone is not null then
    update public.profiles
    set phone = v_phone
    where id = p_user_id
      and (phone is null or trim(phone) = '');
  end if;

  -- Optional display name from the invitee (preferred), else owner hint on single-use
  v_display_name := nullif(trim(coalesce(p_display_name, '')), '');
  if v_display_name is null and not v_is_multi then
    v_display_name := nullif(trim(coalesce(v_invite.invitee_name, '')), '');
  end if;

  if v_display_name is not null then
    update public.profiles
    set full_name = left(v_display_name, 120)
    where id = p_user_id;
  end if;

  return jsonb_build_object(
    'project_id', v_project.id,
    'project_title', v_project.title
  );
exception
  when unique_violation then
    -- Concurrent multi-use join race: treat as already member
    return jsonb_build_object(
      'error', 'Você já participa deste projeto.',
      'project_id', v_invite.project_id,
      'already_member', true
    );
  when others then
    raise;
end;
$$;

revoke all on function public.redeem_project_invite(uuid, uuid, text, text, text) from public;
revoke all on function public.redeem_project_invite(uuid, uuid, text, text, text) from anon;
revoke all on function public.redeem_project_invite(uuid, uuid, text, text, text) from authenticated;

grant execute on function public.redeem_project_invite(uuid, uuid, text, text, text) to service_role;
