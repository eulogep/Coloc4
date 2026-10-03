-- T-0004 — atomic household bootstrap (design §6, §14.8; ADR-011).
begin;
\ir helpers/auth.psql
select plan(17);

select tests.create_user('a@test.local') as a \gset
select tests.create_user('b@test.local') as b \gset
select tests.create_user('noprofile@test.local') as np \gset
insert into public.profiles (user_id, display_name) values (:'a', 'Alice'), (:'b', 'Bruno');

-- Happy path.
select tests.authenticate_as(:'a');
select public.create_household('  Coloc   des Lilas ', 'Europe/Paris') as h \gset
select tests.clear_authentication();

select results_eq(format($$ select name, timezone, currency::text from public.households where id = %L $$, :'h'),
  $$ values ('Coloc des Lilas'::text, 'Europe/Paris'::text, 'EUR'::text) $$,
  'household created with normalized name, timezone and EUR');
select is((select count(*)::int from public.household_members where household_id = :'h'), 1,
  'exactly one membership');
select results_eq(format($$ select user_id, role::text, status::text, display_name_snapshot
                           from public.household_members where household_id = %L $$, :'h'),
  format($$ values (%L::uuid, 'owner'::text, 'active'::text, 'Alice'::text) $$, :'a'),
  'the creator is the active owner, named from their profile');
select results_eq(format($$ select a.action, a.actor_member_id = m.id from public.activity_logs a
                           join public.household_members m on m.household_id = a.household_id
                           where a.household_id = %L $$, :'h'),
  $$ values ('household.created'::text, true) $$,
  'one household.created activity whose actor is the owner');

-- The creator can read it through RLS; another user cannot.
select tests.authenticate_as(:'a');
select is((select count(*)::int from public.households where id = :'h'), 1, 'creator sees the household');
select is((select count(*)::int from public.activity_logs where household_id = :'h'), 1, 'creator sees the activity');
select tests.authenticate_as(:'b');
select is_empty(format($$ select 1 from public.households where id = %L $$, :'h'), 'outsider does not see it');
select is_empty(format($$ select 1 from public.activity_logs where household_id = %L $$, :'h'),
  'outsider does not see its activity');

-- Validation.
select throws_ok($$ select public.create_household('   ', 'Europe/Paris') $$, '22023', 'INVALID_NAME',
  'blank name rejected');
select throws_ok(format($$ select public.create_household(%L, 'Europe/Paris') $$, repeat('x', 61)),
  '22023', 'INVALID_NAME', 'name over 60 chars rejected');
select throws_ok($$ select public.create_household('Coloc', 'Mars/Olympus') $$, '22023', 'INVALID_TIMEZONE',
  'unknown timezone rejected');
select throws_ok($$ select public.create_household('Coloc', null) $$, '22023', 'INVALID_TIMEZONE',
  'missing timezone rejected');

select tests.authenticate_as(:'np');
select throws_ok($$ select public.create_household('Coloc', 'Europe/Paris') $$, 'P0001', 'PROFILE_REQUIRED',
  'a profile is required first');

select tests.authenticate_as_anon();
select throws_ok($$ select public.create_household('Coloc', 'Europe/Paris') $$, '42501', null,
  'anon cannot call create_household');

-- Rollback: a failure after the household insert leaves nothing behind.
select tests.clear_authentication();
create function pg_temp.fail_activity() returns trigger language plpgsql as $f$
begin raise exception 'injected failure'; end $f$;
create trigger inject_failure before insert on public.activity_logs
  for each row execute function pg_temp.fail_activity();

select count(*) as households_before from public.households \gset
select tests.authenticate_as(:'b');
select throws_ok($$ select public.create_household('Coloc fantôme', 'Europe/Paris') $$,
  'P0001', 'injected failure', 'injected failure aborts the bootstrap');
select tests.clear_authentication();
select is((select count(*) from public.households), :'households_before'::bigint,
  'no half-created household after failure');
select is_empty(format($$ select 1 from public.household_members where user_id = %L $$, :'b'),
  'no orphan membership after failure');

select * from finish();
rollback;
