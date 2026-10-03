-- T-0003 — household isolation matrix (design §11.10, §13.3).
-- A, C: active in H1 · B: active in H2 · D: left H1 · E: anonymized in H1 (no user link)
begin;
\ir helpers/auth.psql
select plan(21);

select tests.create_user('a@test.local') as a \gset
select tests.create_user('b@test.local') as b \gset
select tests.create_user('c@test.local') as c \gset
select tests.create_user('d@test.local') as d \gset
select tests.create_household('H1') as h1 \gset
select tests.create_household('H2') as h2 \gset
select tests.add_member(:'h1', :'a', 'Alice', 'owner') as ma \gset
select tests.add_member(:'h1', :'c', 'Clara') as mc \gset
select tests.add_member(:'h1', :'d', 'David', 'member', 'left') as md \gset
select tests.add_member(:'h1', null, 'Ancien colocataire 1', 'member', 'anonymized') as me \gset
select tests.add_member(:'h2', :'b', 'Bruno', 'owner') as mb \gset

-- A (active H1)
select tests.authenticate_as(:'a');
select results_eq($$ select name from public.households $$, $$ values ('H1'::text) $$,
  'A sees only H1');
select is((select count(*)::int from public.household_members), 4,
  'A sees all 4 H1 memberships incl. former and anonymized');
select is_empty(format($$ select 1 from public.households where id = %L $$, :'h2'),
  'A cannot read H2 by direct id');
select is_empty(format($$ select 1 from public.household_members where id = %L $$, :'mb'),
  'A cannot read a H2 member by direct id');
select ok(private.is_active_member(:'h1'), 'helper: A is active in H1');
select ok(not private.is_active_member(:'h2'), 'helper: A is not active in H2');
select is(private.current_member_id(:'h1'), :'ma'::uuid, 'helper: A maps to their H1 member id');

-- Direct writes are denied (writes go through RPCs).
select throws_ok($$ insert into public.households (name, timezone) values ('X', 'Europe/Paris') $$,
  '42501', null, 'no direct household insert');
select throws_ok(format($$ update public.households set name = 'Pwned' where id = %L $$, :'h1'),
  '42501', null, 'no direct household update');
select throws_ok(format($$ update public.household_members set role = 'owner' where id = %L $$, :'mc'),
  '42501', null, 'no direct membership update');
select throws_ok(format($$ insert into public.household_members (household_id, user_id, display_name_snapshot)
                           values (%L, %L, 'Intrus') $$, :'h2', :'a'),
  '42501', null, 'no direct membership insert (cannot self-join)');
select throws_ok(format($$ delete from public.household_members where id = %L $$, :'md'),
  '42501', null, 'no direct membership delete');

-- C (active H1) has the same view as A.
select tests.authenticate_as(:'c');
select is((select count(*)::int from public.household_members), 4, 'C sees H1 memberships');

-- B (active H2) sees nothing of H1.
select tests.authenticate_as(:'b');
select results_eq($$ select name from public.households $$, $$ values ('H2'::text) $$,
  'B sees only H2');
select is_empty(format($$ select 1 from public.household_members where household_id = %L $$, :'h1'),
  'B cannot read H1 memberships');

-- D (left H1) lost access to current household data.
select tests.authenticate_as(:'d');
select is_empty($$ select 1 from public.households $$, 'D (left) sees no household');
select is_empty($$ select 1 from public.household_members $$, 'D (left) sees no membership');
select is(private.current_member_id(:'h1'), null, 'helper: D has no current member id');

-- Anonymous visitors.
select tests.authenticate_as_anon();
select throws_ok($$ select 1 from public.households $$, '42501', null, 'anon cannot read households');
select throws_ok($$ select private.is_active_member(gen_random_uuid()) $$, '42501', null,
  'anon cannot call private helpers');

-- E: an anonymized membership has no user link, so no JWT can ever map to it.
select tests.clear_authentication();
select is((select user_id from public.household_members where id = :'me'), null,
  'E (anonymized) is not linked to any auth user');

select * from finish();
rollback;
