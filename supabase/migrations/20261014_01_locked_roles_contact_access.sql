-- Talind Phase 1 / 01: server-controlled roles and contact access
-- Target: Supabase talind-production (apply to an isolated test branch FIRST).
-- Additive migration: does not delete user profiles, messages or documents.
-- Current accounts' primary roles are backfilled from the signup role metadata.
-- Must be reviewed if future accounts have missing/invalid signup roles.

begin;

create table if not exists public.account_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('learner','teacher','institution','training')),
  assigned_at timestamptz not null default now()
);
alter table public.account_roles enable row level security;
revoke all on public.account_roles from public, anon, authenticated;
grant select on public.account_roles to authenticated;
drop policy if exists account_roles_read_own on public.account_roles;
create policy account_roles_read_own on public.account_roles
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Existing users: preserve their initial user category as the authoritative role.
insert into public.account_roles(user_id, role)
select id, raw_user_meta_data->>'role'
from auth.users
where raw_user_meta_data->>'role' in ('learner','teacher','institution','training')
on conflict (user_id) do nothing;

create schema if not exists talind_private;
revoke all on schema talind_private from public;
grant usage on schema talind_private to authenticated;

create or replace function talind_private.my_role()
returns text
language sql stable security definer set search_path = ''
as $$
  select ar.role from public.account_roles ar
  where ar.user_id = (select auth.uid())
$$;
revoke all on function talind_private.my_role() from public, anon;
grant execute on function talind_private.my_role() to authenticated;

create or replace function talind_private.has_membership(p_plan text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = (select auth.uid())
      and m.plan_code = p_plan
      and m.status = 'active'
      and (m.starts_at is null or m.starts_at <= now())
      and (m.ends_at is null or m.ends_at > now())
  )
$$;
revoke all on function talind_private.has_membership(text) from public, anon;
grant execute on function talind_private.has_membership(text) to authenticated;

-- Internal, authenticated-user-sensitive lookup. Never put this schema in
-- Supabase's exposed REST schemas. No direct RPC grants to anon.
create or replace function talind_private.contact_lookup(
  p_target_user uuid,
  p_requester_role text,
  p_target_role text,
  p_connection_id uuid default null
)
returns table(
  allowed boolean,
  display_name text,
  email text,
  phone text,
  whatsapp text,
  reason text
)
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_actual_role text;
  v_allowed boolean := false;
  v_reason text := 'Contact access is not available for this account.';
  v_conn public.match_connections%rowtype;
begin
  if v_uid is null then
    return query select false, null::text, null::text, null::text, null::text,
      'Please log in to view contact details.'::text;
    return;
  end if;

  select ar.role into v_actual_role
  from public.account_roles ar where ar.user_id = v_uid;

  if v_actual_role is distinct from p_requester_role
     or p_requester_role not in ('learner','teacher','institution','training') then
    return query select false, null::text, null::text, null::text, null::text,
      'Account role is not authorized for this request.'::text;
    return;
  end if;

  if p_target_user is null or p_target_user = v_uid
     or not exists (
       select 1 from public.public_profiles pp
       where pp.user_id = p_target_user and pp.role = p_target_role
         and pp.is_active = true
     )
     or not exists (
       select 1 from public.account_roles tar
       where tar.user_id = p_target_user and tar.role = p_target_role
     ) then
    return query select false, null::text, null::text, null::text, null::text,
      'This profile is not available for direct contact.'::text;
    return;
  end if;

  if p_requester_role = 'learner' then
    -- Students/parents may contact published teachers and providers for free.
    v_allowed := true;
    v_reason := 'Student / Parent contact access is free.';
  elsif p_requester_role = 'teacher' and p_target_role in ('institution','training') then
    -- Applying for a teaching position remains free.
    v_allowed := true;
    v_reason := 'Teacher job-seeker access is free.';
  elsif p_requester_role = 'teacher' and p_target_role = 'learner' then
    -- The old RPC must NEVER bypass the newer quote/consent requirements.
    v_reason := 'An accepted quote, active membership and both agreements are required.';
    if p_connection_id is not null then
      select * into v_conn
      from public.match_connections mc
      where mc.id = p_connection_id
        and (
          (mc.initiator_user_id = v_uid and mc.target_user_id = p_target_user
           and mc.initiator_role = 'teacher' and mc.target_role = 'learner')
          or
          (mc.target_user_id = v_uid and mc.initiator_user_id = p_target_user
           and mc.target_role = 'teacher' and mc.initiator_role = 'learner')
        )
        and mc.status = 'accepted'
        and mc.quote_amount is not null;

      if found and talind_private.has_membership('teacher-services')
         and exists (
           select 1 from public.engagement_agreements ea
           where ea.connection_id = p_connection_id
             and ea.user_id = v_uid
             and ea.agreement_type = 'provider_professional'
         )
         and exists (
           select 1 from public.engagement_agreements ea
           where ea.connection_id = p_connection_id
             and ea.user_id = p_target_user
             and ea.agreement_type = 'guardian_contact_consent'
         ) then
        v_allowed := true;
        v_reason := 'Contact access approved.';
      end if;
    end if;
  elsif p_requester_role = 'institution' then
    v_allowed := talind_private.has_membership('institution');
    v_reason := case when v_allowed then 'Institution membership is active.'
      else 'An active Institution membership is required.' end;
  elsif p_requester_role = 'training' then
    v_allowed := talind_private.has_membership('training');
    v_reason := case when v_allowed then 'Training membership is active.'
      else 'An active Training Provider membership is required.' end;
  end if;

  return query
    select v_allowed, pp.display_name,
      case when v_allowed then au.email::text else null::text end,
      case when v_allowed then p.phone else null::text end,
      case when v_allowed then p.whatsapp else null::text end,
      v_reason
    from public.public_profiles pp
    join public.profiles p on p.id = pp.user_id
    left join auth.users au on au.id = pp.user_id
    where pp.user_id = p_target_user and pp.role = p_target_role
      and pp.is_active = true
    limit 1;
end;
$$;
revoke all on function talind_private.contact_lookup(uuid,text,text,uuid) from public, anon;
grant execute on function talind_private.contact_lookup(uuid,text,text,uuid) to authenticated;

-- Keep both existing application RPC names, with no elevated privileges.
create or replace function public.get_match_contact(
  p_target_user uuid, p_requester_role text, p_target_role text
)
returns table(allowed boolean,display_name text,email text,phone text,whatsapp text,reason text)
language sql security invoker set search_path = ''
as $$
  select * from talind_private.contact_lookup(
    p_target_user,p_requester_role,p_target_role,null::uuid
  )
$$;

create or replace function public.get_match_contact_v2(
  p_connection_id uuid, p_target_user uuid,
  p_requester_role text, p_target_role text
)
returns table(allowed boolean,display_name text,email text,phone text,whatsapp text,reason text)
language sql security invoker set search_path = ''
as $$
  select * from talind_private.contact_lookup(
    p_target_user,p_requester_role,p_target_role,p_connection_id
  )
$$;

revoke all on function public.get_match_contact(uuid,text,text) from public, anon;
revoke all on function public.get_match_contact_v2(uuid,uuid,text,text) from public, anon;
grant execute on function public.get_match_contact(uuid,text,text) to authenticated;
grant execute on function public.get_match_contact_v2(uuid,uuid,text,text) to authenticated;

-- Account role is created by the trusted auth trigger, not by the browser.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  selected_role text;
begin
  selected_role := case
    when new.raw_user_meta_data->>'role'
      in ('learner','teacher','institution','training')
      then new.raw_user_meta_data->>'role'
    else 'learner'
  end;

  insert into public.account_roles(user_id,role)
    values (new.id,selected_role)
    on conflict (user_id) do nothing;

  insert into public.profiles(id,display_name)
    values (new.id,coalesce(new.raw_user_meta_data->>'display_name',''))
    on conflict (id) do nothing;

  insert into public.role_profiles(user_id,role)
    values (new.id,selected_role)
    on conflict (user_id,role) do nothing;

  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Fix the reported mutable search_path warning for the timestamp trigger.
alter function public.set_updated_at() set search_path = pg_catalog;

commit;
