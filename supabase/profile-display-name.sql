-- Improve default profile names: include email domain so
-- rfurno@protonmail.com and rfurno@proton.me are distinguishable.
-- Run once in Supabase SQL Editor (safe to re-run).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  email_local text;
  email_domain text;
  default_name text;
begin
  email_local := split_part(new.email, '@', 1);
  email_domain := split_part(new.email, '@', 2);

  if email_domain <> '' then
    default_name := email_local || ' (' || email_domain || ')';
  else
    default_name := email_local;
  end if;

  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', default_name),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;