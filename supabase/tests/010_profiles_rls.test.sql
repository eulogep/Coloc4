-- T-0002 — profiles are private to their owner (design §11.10: B cannot read A's profile).
begin;
\ir helpers/auth.psql
select plan(12);

select tests.create_user('a@test.local') as a \gset
select tests.create_user('b@test.local') as b \gset

-- A creates their own profile.
select tests.authenticate_as(:'a');
select lives_ok(
  format($$ insert into public.profiles (user_id, display_name) values (%L, 'Alice') $$, :'a'),
  'A can create their own profile');
select results_eq(
  $$ select display_name from public.profiles $$, $$ values ('Alice'::text) $$,
  'A reads exactly their own profile');

-- A cannot create a profile for B.
select throws_ok(
  format($$ insert into public.profiles (user_id, display_name) values (%L, 'Mallory') $$, :'b'),
  '42501', null, 'A cannot create a profile for B');

-- B creates theirs; neither sees the other's.
select tests.authenticate_as(:'b');
select lives_ok(
  format($$ insert into public.profiles (user_id, display_name) values (%L, 'Bob') $$, :'b'),
  'B can create their own profile');
select results_eq(
  $$ select display_name from public.profiles $$, $$ values ('Bob'::text) $$,
  'B cannot read A''s profile');
select is_empty(
  format($$ select 1 from public.profiles where user_id = %L $$, :'a'),
  'B cannot read A''s profile even by direct id');

-- B's update on A's profile touches nothing.
update public.profiles set display_name = 'Hacked' where user_id = :'a';
select tests.clear_authentication();
select results_eq(
  format($$ select display_name from public.profiles where user_id = %L $$, :'a'),
  $$ values ('Alice'::text) $$,
  'B cannot update A''s profile');

-- B cannot move their profile onto another user id (column not updatable).
select tests.authenticate_as(:'b');
select throws_ok(
  format($$ update public.profiles set user_id = %L where user_id = %L $$, :'a', :'b'),
  '42501', null, 'user_id is not updatable');

-- No delete grant.
select throws_ok(
  $$ delete from public.profiles $$,
  '42501', null, 'authenticated users cannot delete profiles directly');

-- Display name must be trimmed and non-empty.
select throws_ok(
  format($$ update public.profiles set display_name = '  Bob ' where user_id = %L $$, :'b'),
  '23514', null, 'untrimmed display name is rejected');

-- Anonymous visitors have no access at all.
select tests.authenticate_as_anon();
select throws_ok(
  $$ select * from public.profiles $$,
  '42501', null, 'anon cannot read profiles');

-- Deleting the auth user removes the private profile.
select tests.clear_authentication();
delete from auth.users where id = :'a';
select is_empty(
  format($$ select 1 from public.profiles where user_id = %L $$, :'a'),
  'profile follows auth user deletion');

select * from finish();
rollback;
