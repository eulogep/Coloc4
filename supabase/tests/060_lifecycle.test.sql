-- T-0012 — leave, transfer, archive, account deletion (design §5.7, §10, §14.5).
begin;
\ir helpers/auth.psql
select plan(33);

select tests.create_user('alice@test.local') as a \gset
select tests.create_user('bob@test.local') as b \gset
select tests.create_user('carl@test.local') as c \gset
select tests.create_user('dora@test.local') as d \gset
insert into public.profiles (user_id, display_name) values (:'a', 'Alice'), (:'b', 'Bob'), (:'c', 'Carl'), (:'d', 'Dora');

select tests.authenticate_as(:'a');
select public.create_household('Coloc', 'Europe/Paris') as h \gset
select token as t from public.create_invitation(:'h') \gset
select tests.authenticate_as(:'b');
select result_code from public.join_household(:'t');
select tests.authenticate_as(:'c');
select result_code from public.join_household(:'t');
select tests.clear_authentication();
select id as ma from public.household_members where household_id = :'h' and user_id = :'a' \gset
select id as mb from public.household_members where household_id = :'h' and user_id = :'b' \gset
select id as mc from public.household_members where household_id = :'h' and user_id = :'c' \gset

create function pg_temp.net(p_member uuid) returns bigint language sql as $f$
  select private.member_net(m.household_id, m.id)::bigint from public.household_members m where m.id = p_member $f$;
create function pg_temp.sum_net(p_household uuid) returns numeric language sql as $f$
  select sum(private.member_net(p_household, m.id)) from public.household_members m where m.household_id = p_household $f$;

-- Bob pays 90 € for everyone; Carl pays 30 € for Bob and Carl.
select tests.authenticate_as(:'b');
select public.create_expense(:'h', 'Courses', '9000', :'mb', 'equal', current_date, jsonb_build_array(:'ma', :'mb', :'mc')) as e1 \gset
select tests.authenticate_as(:'c');
select public.create_expense(:'h', 'Pizza', '3000', :'mc', 'equal', current_date, jsonb_build_array(:'mb', :'mc')) as e2 \gset
select tests.clear_authentication();
select pg_temp.net(:'mb') as bob_net \gset

-- ===== Historical identity: leaving keeps history and balances (§14.5) =====
select tests.authenticate_as(:'b');
select lives_ok(format($$ select public.leave_household(%L) $$, :'h'), 'a member with a balance can leave');
select tests.clear_authentication();
select results_eq(format($$ select status::text, left_at is not null, user_id from public.household_members where id = %L $$, :'mb'),
  format($$ values ('left'::text, true, %L::uuid) $$, :'b'), 'Bob is a former member, still linked for rejoining');
select is(pg_temp.net(:'mb'), :'bob_net'::bigint, 'his balance is unchanged');
select is((select paid_by_member_id from public.expenses where id = :'e1'), :'mb'::uuid, 'history is not reassigned');
select is(pg_temp.sum_net(:'h'), 0::numeric, 'Σ net = 0 after leaving');
select tests.authenticate_as(:'b');
select is_empty(format($$ select 1 from public.expenses where household_id = %L $$, :'h'), 'a former member loses access');
select throws_ok(format($$ select public.leave_household(%L) $$, :'h'), '42501', 'NOT_A_MEMBER', 'cannot leave twice');

-- The former member still appears in balances seen by active members.
select tests.authenticate_as(:'a');
select is((select net_minor::bigint from public.member_balances where member_id = :'mb'), :'bob_net'::bigint,
  'active members still see the former member balance');
-- The former member cannot be in new expenses.
select throws_ok(format($$ select public.create_expense(%L, 'X', '100', %L, 'equal', current_date, jsonb_build_array(%L::uuid)) $$, :'h', :'ma', :'mb'),
  '22023', 'INVALID_PARTICIPANTS', 'former member excluded from new expenses');

-- ===== Rejoin: same row (§5.8) =====
select tests.authenticate_as(:'a');
select token as t2 from public.create_invitation(:'h') \gset
select tests.authenticate_as(:'b');
select results_eq(format($$ select result_code from public.join_household(%L) $$, :'t2'), $$ values ('REACTIVATED'::text) $$, 'Bob rejoins');
select tests.clear_authentication();
select is((select count(*)::int from public.household_members where household_id = :'h' and user_id = :'b'), 1, 'no duplicate identity');
select is(pg_temp.net(:'mb'), :'bob_net'::bigint, 'same balance after rejoining');

-- ===== Owner rules =====
select tests.authenticate_as(:'a');
select throws_ok(format($$ select public.leave_household(%L) $$, :'h'), 'P0001', 'OWNER_MUST_TRANSFER', 'the owner cannot leave');
select tests.authenticate_as(:'c');
select throws_ok(format($$ select public.transfer_ownership(%L, %L) $$, :'h', :'mc'), '42501', 'NOT_OWNER', 'only the owner can transfer');
select throws_ok(format($$ select public.archive_household(%L) $$, :'h'), '42501', 'NOT_OWNER', 'only the owner can archive');
select tests.authenticate_as(:'a');
select throws_ok(format($$ select public.transfer_ownership(%L, %L) $$, :'h', :'ma'), '22023', 'INVALID_MEMBER', 'cannot transfer to self');
select lives_ok(format($$ select public.transfer_ownership(%L, %L) $$, :'h', :'mc'), 'owner transfers to Carl');
select tests.clear_authentication();
select results_eq(format($$ select id from public.household_members where household_id = %L and role = 'owner' $$, :'h'),
  format($$ values (%L::uuid) $$, :'mc'), 'exactly one owner: Carl');
select tests.authenticate_as(:'a');
select lives_ok(format($$ select public.leave_household(%L) $$, :'h'), 'the former owner can now leave');

-- ===== Account deletion: anonymization keeps the books (§10.2, §14.5) =====
select tests.authenticate_as(:'c');
select throws_ok($$ select public.delete_my_account() $$, 'P0001', 'OWNER_MUST_TRANSFER',
  'an owner with active roommates must transfer first');
select tests.authenticate_as(:'b');
select lives_ok($$ select public.delete_my_account() $$, 'Bob deletes his account');
select tests.authenticate_as(:'a');
select lives_ok($$ select public.delete_my_account() $$, 'Alice (former member) deletes her account');
select tests.clear_authentication();

select results_eq(format($$ select display_name_snapshot, status::text, user_id is null from public.household_members
                           where id in (%L, %L) order by display_name_snapshot $$, :'mb', :'ma'),
  $$ values ('Ancien colocataire 1'::text, 'anonymized'::text, true), ('Ancien colocataire 2'::text, 'anonymized'::text, true) $$,
  'both are anonymized with distinct names');
select is(pg_temp.net(:'mb'), :'bob_net'::bigint, 'anonymized balance is unchanged');
select is(pg_temp.sum_net(:'h'), 0::numeric, 'Σ net = 0 after anonymization');
select is((select count(*)::int from public.expenses where household_id = :'h'), 2, 'expenses are kept');
select is_empty(format($$ select 1 from public.profiles where user_id in (%L, %L) $$, :'a', :'b'), 'private profiles are deleted');
select is_empty(format($$ select 1 from auth.users where id in (%L, %L) $$, :'a', :'b'), 'auth accounts are deleted');
select ok((select bool_and(actor_member_id is null) from public.activity_logs where action = 'member.anonymized' and household_id = :'h'),
  'anonymization is logged as a system action');

-- A new account after anonymization gets a new identity (anonymized rows never match).
select tests.authenticate_as(:'c');
select token as t3 from public.create_invitation(:'h') \gset
select tests.authenticate_as(:'d');
select results_eq(format($$ select result_code from public.join_household(%L) $$, :'t3'), $$ values ('JOINED'::text) $$,
  'a new account joins as a new identity');

-- An owner alone deletes their account: the household is archived.
select tests.authenticate_as(:'d');
select public.create_household('Solo', 'Europe/Paris') as solo \gset
select lives_ok($$ select public.delete_my_account() $$, 'Dora deletes her account (owner alone in Solo)');
select tests.clear_authentication();
select ok((select archived_at is not null from public.households where id = :'solo'), 'her solo household is archived');
select results_eq(format($$ select role::text, status::text from public.household_members where household_id = %L $$, :'solo'),
  $$ values ('member'::text, 'anonymized'::text) $$, 'the former owner row is anonymized, no owner left');

select * from finish();
rollback;
