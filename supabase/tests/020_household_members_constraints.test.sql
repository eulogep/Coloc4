-- T-0003 — membership identity constraints (design §5.2, §5.3, §7; ADR-002).
begin;
\ir helpers/auth.psql
select plan(14);

select tests.create_user('a@test.local') as a \gset
select tests.create_user('c@test.local') as c \gset
select tests.create_household('Coloc Paris') as h1 \gset
select tests.create_household('Coloc Lyon') as h2 \gset

select lives_ok(format($$ select tests.add_member(%L, %L, 'Alice', 'owner') $$, :'h1', :'a'),
  'active owner membership');
select throws_ok(format($$ select tests.add_member(%L, %L, 'Clara', 'owner') $$, :'h1', :'c'),
  '23505', null, 'at most one owner per household');
select throws_ok(format($$ select tests.add_member(%L, %L, 'Alice bis') $$, :'h1', :'a'),
  '23505', null, 'a user has at most one membership per household');
select lives_ok(format($$ select tests.add_member(%L, %L, 'Alice') $$, :'h2', :'a'),
  'the same user may belong to another household');

-- Shape checks.
select throws_ok(format($$ insert into public.household_members (household_id, user_id, display_name_snapshot, status)
                           values (%L, null, 'X', 'active') $$, :'h1'),
  '23514', null, 'active requires a user_id');
select throws_ok(format($$ insert into public.household_members (household_id, user_id, display_name_snapshot, status, anonymized_at)
                           values (%L, %L, 'X', 'anonymized', now()) $$, :'h2', :'c'),
  '23514', null, 'anonymized requires user_id IS NULL');
select throws_ok(format($$ insert into public.household_members (household_id, user_id, display_name_snapshot, status)
                           values (%L, %L, 'X', 'left') $$, :'h2', :'c'),
  '23514', null, 'left requires left_at');
select throws_ok(format($$ insert into public.household_members (household_id, user_id, display_name_snapshot, status, left_at)
                           values (%L, null, 'X', 'left', now()) $$, :'h2'),
  '23514', null, 'a left member keeps its user link (needed to rejoin)');
select throws_ok(format($$ insert into public.household_members (household_id, user_id, display_name_snapshot, role, status, left_at)
                           values (%L, %L, 'X', 'owner', 'left', now()) $$, :'h2', :'c'),
  '23514', null, 'an owner must be active');
select throws_ok(format($$ insert into public.household_members (household_id, user_id, display_name_snapshot)
                           values (%L, %L, ' padded ') $$, :'h2', :'c'),
  '23514', null, 'display name snapshot must be trimmed');

-- Several anonymized members can coexist in one household (NULL user_id).
select lives_ok(format($$ select tests.add_member(%L, null, 'Ancien colocataire 1', 'member', 'anonymized'),
                                 tests.add_member(%L, null, 'Ancien colocataire 2', 'member', 'anonymized') $$, :'h1', :'h1'),
  'several anonymized members may coexist');

-- Households: EUR only in M1, trimmed name.
select throws_ok($$ insert into public.households (name, timezone, currency) values ('X', 'Europe/Paris', 'USD') $$,
  '23514', null, 'M1 households are EUR only');

-- Auth deletion is blocked while a membership references the user (PC-2).
select throws_ok(format($$ delete from auth.users where id = %L $$, :'a'),
  '23503', null, 'auth user with a membership cannot be deleted directly');

select has_index('public', 'household_members', 'household_members_active_user_idx',
  'index for the RLS helper lookup');

select * from finish();
rollback;
