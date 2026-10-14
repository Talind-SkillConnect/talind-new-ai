-- Talind Phase 1 / 02: enforce membership, chat and quote permissions server-side.
-- Requires 20261014_01_locked_roles_contact_access.sql first.
-- Intended for isolated branch testing before any production migration.
-- No DELETE, TRUNCATE or bulk user-data rewrites.

begin;

-- Bypass account_roles' own-row RLS solely for the target's role assertion.
create or replace function talind_private.target_has_role(p_user uuid,p_role text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.account_roles ar
    where ar.user_id = p_user and ar.role = p_role)
$$;
revoke all on function talind_private.target_has_role(uuid,text) from public, anon;
grant execute on function talind_private.target_has_role(uuid,text) to authenticated;

create or replace function talind_private.can_start_connection(
  p_initiator_role text, p_target_role text
)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when talind_private.my_role() is distinct from p_initiator_role then false
    when p_initiator_role = 'learner' then true
    when p_initiator_role = 'teacher' and p_target_role <> 'learner' then true
    when p_initiator_role = 'teacher' and p_target_role = 'learner'
      then talind_private.has_membership('teacher-services')
    when p_initiator_role = 'institution'
      then talind_private.has_membership('institution')
    when p_initiator_role = 'training'
      then talind_private.has_membership('training')
    else false
  end
$$;
revoke all on function talind_private.can_start_connection(text,text) from public, anon;
grant execute on function talind_private.can_start_connection(text,text) to authenticated;

create or replace function talind_private.can_send_message(p_connection_id uuid)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_peer_role text;
  v_peer_id uuid;
  v_connection public.match_connections%rowtype;
begin
  if v_actor is null then return false; end if;
  select * into v_connection
    from public.match_connections
    where id = p_connection_id;
  if not found then return false; end if;

  select ar.role into v_role
    from public.account_roles ar where ar.user_id = v_actor;

  if v_actor = v_connection.initiator_user_id
     and v_role = v_connection.initiator_role then
    v_peer_role := v_connection.target_role;
    v_peer_id := v_connection.target_user_id;
  elsif v_actor = v_connection.target_user_id
     and v_role = v_connection.target_role then
    v_peer_role := v_connection.initiator_role;
    v_peer_id := v_connection.initiator_user_id;
  else
    return false;
  end if;

  if v_role = 'learner' then return true; end if;

  if v_role = 'teacher' and v_peer_role = 'learner' then
    -- Teacher service membership is needed to initiate; an incoming learner
    -- message permits a free reply without unlocking contact details/quotes.
    return talind_private.has_membership('teacher-services') or exists (
      select 1 from public.match_messages mm
      where mm.connection_id = p_connection_id
        and mm.sender_user_id = v_peer_id
    );
  end if;

  if v_role = 'teacher' then return true; end if;

  if v_role = 'institution' then
    return talind_private.has_membership('institution');
  end if;

  if v_role = 'training' then
    return talind_private.has_membership('training');
  end if;

  return false;
end;
$$;
revoke all on function talind_private.can_send_message(uuid) from public, anon;
grant execute on function talind_private.can_send_message(uuid) to authenticated;

-- Block forged account types, connections to unpublished profiles, and
-- direct paid-service initiation without an active membership.
drop policy if exists connections_insert_own on public.match_connections;
create policy connections_insert_own on public.match_connections
for insert to authenticated with check (
  initiator_user_id = (select auth.uid())
  and target_user_id <> initiator_user_id
  and status in ('shortlisted','interest_expressed')
  and talind_private.can_start_connection(initiator_role,target_role)
  and talind_private.target_has_role(target_user_id,target_role)
  and (
    (target_role = 'learner'
      and context_type = 'learner_requirement'
      and exists (
        select 1 from public.learner_requirements lr
        where lr.id = context_id
          and lr.user_id = target_user_id
          and lr.status = 'active'
      ))
    or
    (target_role <> 'learner'
      and exists (
        select 1 from public.public_profiles pp
        where pp.user_id = target_user_id
          and pp.role = target_role and pp.is_active = true
      ))
  )
);

-- The chat INSERT policy cannot rely on browser-side membership controls.
drop policy if exists messages_insert_participant on public.match_messages;
create policy messages_insert_participant on public.match_messages
for insert to authenticated with check (
  sender_user_id = (select auth.uid())
  and talind_private.can_send_message(connection_id)
);

-- Trigger enforces transitions even when someone bypasses the website UI and
-- sends direct REST UPDATE requests against match_connections.
create or replace function talind_private.guard_connection_write()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_other_role text;
  v_peer_id uuid;
  v_paid boolean;
  v_changed_status boolean;
  v_changed_quote boolean;
begin
  -- Authorized backend administration may legitimately repair records.
  if auth.role() = 'service_role' then return new; end if;
  if v_uid is null then
    raise exception 'Login required for match changes'
      using errcode = '42501';
  end if;

  select role into v_role
  from public.account_roles where user_id = v_uid;

  if tg_op = 'INSERT' then
    if new.initiator_user_id <> v_uid
      or v_role is distinct from new.initiator_role
      or new.target_user_id = v_uid
      or new.status not in ('shortlisted','interest_expressed')
      or new.quote_amount is not null
      or new.quote_note is not null
      or new.quote_currency is distinct from 'INR'
      or new.last_message_at is not null
      or new.updated_by is distinct from v_uid
      or not talind_private.can_start_connection(new.initiator_role,new.target_role)
    then
      raise exception 'Unauthorized match creation'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if v_uid = old.initiator_user_id and v_role = old.initiator_role then
    v_other_role := old.target_role;
    v_peer_id := old.target_user_id;
  elsif v_uid = old.target_user_id and v_role = old.target_role then
    v_other_role := old.initiator_role;
    v_peer_id := old.initiator_user_id;
  else
    raise exception 'Only the authorized account participant may update a match'
      using errcode = '42501';
  end if;

  if row(new.initiator_user_id,new.target_user_id,new.initiator_role,
         new.target_role,new.context_type,new.context_id)
     is distinct from
     row(old.initiator_user_id,old.target_user_id,old.initiator_role,
         old.target_role,old.context_type,old.context_id)
  then
    raise exception 'Match participants and context cannot be changed'
      using errcode = '42501';
  end if;

  v_changed_status := new.status is distinct from old.status;
  v_changed_quote := row(new.quote_amount,new.quote_currency,new.quote_note)
    is distinct from row(old.quote_amount,old.quote_currency,old.quote_note);

  -- Even metadata-only updates must not impersonate another participant.
  if new.updated_by is distinct from v_uid then
    raise exception 'Match changes must identify the authenticated actor'
      using errcode = '42501';
  end if;

  v_paid := (v_role = 'teacher' and v_other_role = 'learner'
    and talind_private.has_membership('teacher-services'));

  if v_changed_quote then
    if not v_paid or new.status <> 'quote_submitted'
       or new.quote_amount is null or new.quote_amount <= 0
       or new.quote_currency is distinct from 'INR' then
      raise exception 'Only a paid teacher can submit or edit a valid learner quote'
        using errcode = '42501';
    end if;
  end if;

  if v_changed_status then
    if new.status = 'quote_submitted' then
      if not v_paid
         or old.status not in ('shortlisted','interest_expressed')
         or new.quote_amount is null or new.quote_amount <= 0 then
        raise exception 'Only a paid teacher may submit a valid learner quote'
          using errcode = '42501';
      end if;
    elsif new.status = 'accepted' then
      if v_role <> 'learner' or v_other_role <> 'teacher'
         or old.status <> 'quote_submitted'
         or old.quote_amount is null or old.quote_amount <= 0 then
        raise exception 'Only the learner or guardian may accept a pending teacher quote'
          using errcode = '42501';
      end if;
    elsif new.status = 'declined' then
      if v_role <> 'learner' or v_other_role <> 'teacher'
         or old.status <> 'quote_submitted' then
        raise exception 'Only a learner or guardian may decline a pending quote'
          using errcode = '42501';
      end if;
    elsif new.status in ('shortlisted','interest_expressed') then
      if old.status not in ('shortlisted','interest_expressed')
         or not (
           talind_private.can_start_connection(v_role,v_other_role)
           or talind_private.can_send_message(old.id)
         ) then
        raise exception 'Unauthorized match status transition'
          using errcode = '42501';
      end if;
    elsif new.status <> 'closed' then
      raise exception 'Unsupported match status transition'
        using errcode = '42501';
    end if;
  end if;

  if new.last_message_at is distinct from old.last_message_at
     and not talind_private.can_send_message(old.id) then
    raise exception 'Messaging permission required before updating activity'
      using errcode = '42501';
  end if;

  return new;
end;
$$;
revoke all on function talind_private.guard_connection_write() from public, anon, authenticated;

drop trigger if exists talind_guard_connection_write on public.match_connections;
create trigger talind_guard_connection_write
  before insert or update on public.match_connections
  for each row execute function talind_private.guard_connection_write();

commit;
