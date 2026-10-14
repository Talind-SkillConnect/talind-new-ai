-- Talind Phase 1 security regression test (isolated Supabase TEST BRANCH ONLY)
-- Run after migration 01 then migration 02.
-- Uses disposable synthetic users and ROLLBACK. Never run against live customers.
-- This asserts core authorization helpers and database update triggers.
-- API-side RLS request tests remain required before production deployment.

begin;

do $test$
declare
  v_learner uuid := gen_random_uuid();
  v_teacher uuid := gen_random_uuid();
  v_other_teacher uuid := gen_random_uuid();
  v_connection uuid;
  v_allowed boolean;
begin
  -- Seed disposable identities. The auth trigger must also create the
  -- corresponding trusted account_roles and role_profiles rows.
  insert into auth.users
    (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,
      raw_user_meta_data,raw_app_meta_data,created_at,updated_at)
  values
    (v_learner,'00000000-0000-0000-0000-000000000000',
     'authenticated','authenticated','phase1-learner-'||v_learner||'@example.invalid',
     '',now(),'{"role":"learner"}'::jsonb,'{}'::jsonb,now(),now()),
    (v_teacher,'00000000-0000-0000-0000-000000000000',
     'authenticated','authenticated','phase1-teacher-'||v_teacher||'@example.invalid',
     '',now(),'{"role":"teacher"}'::jsonb,'{}'::jsonb,now(),now()),
    (v_other_teacher,'00000000-0000-0000-0000-000000000000',
     'authenticated','authenticated','phase1-other-'||v_other_teacher||'@example.invalid',
     '',now(),'{"role":"teacher"}'::jsonb,'{}'::jsonb,now(),now());

  if (select count(*) from public.account_roles
      where user_id in (v_learner,v_teacher,v_other_teacher)) <> 3 then
    raise exception 'FAIL: new users did not receive locked account roles';
  end if;

  insert into public.public_profiles(user_id,role,display_name,is_active)
  values (v_learner,'learner','Test Learner',true),
         (v_teacher,'teacher','Test Teacher',true),
         (v_other_teacher,'teacher','Other Test Teacher',true);

  perform set_config('request.jwt.claim.role','authenticated',true);
  perform set_config('request.jwt.claim.sub',v_teacher::text,true);
  if auth.uid() is distinct from v_teacher then
    raise exception 'TEST SETUP ERROR: mock Supabase JWT claims not recognized';
  end if;
  if talind_private.my_role() <> 'teacher' then
    raise exception 'FAIL: actor primary role not retrieved correctly';
  end if;
  if talind_private.can_start_connection('learner','teacher') then
    raise exception 'FAIL: teacher can spoof learner role when creating a connection';
  end if;
  if talind_private.can_start_connection('teacher','learner') then
    raise exception 'FAIL: unpaid teacher can initiate a learner service connection';
  end if;

  select allowed into v_allowed
    from public.get_match_contact(v_other_teacher,'learner','teacher');
  if v_allowed is distinct from false then
    raise exception 'FAIL: teacher spoofed learner role and unlocked teacher contact';
  end if;

  perform set_config('request.jwt.claim.sub',v_learner::text,true);
  select allowed into v_allowed
    from public.get_match_contact(v_other_teacher,'learner','teacher');
  if v_allowed is distinct from true then
    raise exception 'FAIL: learner cannot access the intentionally free teacher contact';
  end if;

  -- Set up a relationship initiated by the parent/learner (permitted).
  -- Use service_role claims for fixture insertion; all inserts are rolled back.
  perform set_config('request.jwt.claim.role','service_role',true);
  insert into public.match_connections
    (initiator_user_id,target_user_id,initiator_role,target_role,context_type,
      status,updated_by)
  values (v_learner,v_teacher,'learner','teacher','teacher_profile',
    'interest_expressed',v_learner)
  returning id into v_connection;

  perform set_config('request.jwt.claim.role','authenticated',true);
  perform set_config('request.jwt.claim.sub',v_teacher::text,true);
  if talind_private.can_send_message(v_connection) then
    raise exception 'FAIL: unpaid teacher can initiate a first message';
  end if;

  -- The teacher cannot forge quote submission or accepted status.
  begin
    update public.match_connections
      set status='quote_submitted',quote_amount=1000,updated_by=v_teacher
      where id=v_connection;
    raise exception 'FAIL: unpaid teacher changed status to quote_submitted';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.match_connections
      set status='accepted',updated_by=v_teacher
      where id=v_connection;
    raise exception 'FAIL: teacher accepted own quote';
  exception when insufficient_privilege then null;
  end;

  -- Parent message enables only teacher reply, not direct contact or quote.
  perform set_config('request.jwt.claim.sub',v_learner::text,true);
  if not talind_private.can_send_message(v_connection) then
    raise exception 'FAIL: learner cannot send a message';
  end if;
  insert into public.match_messages(connection_id,sender_user_id,body)
  values(v_connection,v_learner,'Test message; rolled back');

  perform set_config('request.jwt.claim.sub',v_teacher::text,true);
  if not talind_private.can_send_message(v_connection) then
    raise exception 'FAIL: teacher cannot reply to a learner who initiated chat';
  end if;
  select allowed into v_allowed
    from public.get_match_contact_v2(v_connection,v_learner,'teacher','learner');
  if v_allowed is distinct from false then
    raise exception 'FAIL: replying without membership unlocked learner contact';
  end if;

  if has_function_privilege('anon','public.get_match_contact(uuid,text,text)','EXECUTE')
    or has_function_privilege('anon','public.get_match_contact_v2(uuid,uuid,text,text)','EXECUTE')
    or has_function_privilege('anon','public.handle_new_user()','EXECUTE') then
    raise exception 'FAIL: anonymous role can execute privileged public RPC';
  end if;

  if has_table_privilege('authenticated','public.account_roles','INSERT')
    or has_table_privilege('authenticated','public.account_roles','UPDATE')
    or has_table_privilege('authenticated','public.account_roles','DELETE') then
    raise exception 'FAIL: users can modify their primary account role';
  end if;

  raise notice 'Phase 1 SQL helper/trigger regression checks passed (fixtures rolled back).';
end;
$test$;

rollback;
