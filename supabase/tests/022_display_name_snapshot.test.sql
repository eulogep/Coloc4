-- T-0003 — display name snapshot rules (design §5.4).
begin;
\ir helpers/auth.psql
select plan(3);

select tests.create_user('a@test.local') as a \gset
insert into public.profiles (user_id, display_name) values (:'a', 'Alice');
select tests.create_household('H1') as h1 \gset
select tests.create_household('H2') as h2 \gset
select tests.create_household('H3') as h3 \gset
select tests.add_member(:'h1', :'a', 'Alice', 'owner') as m1 \gset
select tests.add_member(:'h2', :'a', 'Alice') as m2 \gset
select tests.add_member(:'h3', :'a', 'Alice', 'member', 'left') as m3 \gset

select tests.authenticate_as(:'a');
update public.profiles set display_name = 'Alice D.' where user_id = :'a';
select tests.clear_authentication();

select is((select display_name_snapshot from public.household_members where id = :'m1'), 'Alice D.',
  'active membership follows the profile name');
select is((select display_name_snapshot from public.household_members where id = :'m2'), 'Alice D.',
  'every active membership follows the profile name');
select is((select display_name_snapshot from public.household_members where id = :'m3'), 'Alice',
  'a former membership keeps its frozen name');

select * from finish();
rollback;
