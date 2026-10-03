-- Coloc4 — hosted project preflight (run in the Supabase SQL Editor after `db push`).
-- Everything happens inside one transaction that is ROLLED BACK: nothing is kept.
-- Expected result: one row where every column is true.

begin;

-- A throwaway user, profile and household created as the real API roles would.
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-4000-8000-00000000c0c4', '00000000-0000-0000-0000-000000000000', 'authenticated',
        'authenticated', 'preflight@coloc4.invalid', '{}', '{}', now(), now());
insert into public.profiles (user_id, display_name) values ('00000000-0000-4000-8000-00000000c0c4', 'Preflight');

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000c0c4","role":"authenticated"}', true);

create temporary table preflight_household as
  select public.create_household('Preflight', 'Europe/Paris') as id;

-- Commit-path check for money writes (deferred share-sum trigger as `authenticated`).
select public.create_expense(
  (select id from preflight_household), 'Preflight', '1000',
  (select id from public.household_members where user_id = '00000000-0000-4000-8000-00000000c0c4'),
  'equal', current_date,
  jsonb_build_array((select id from public.household_members where user_id = '00000000-0000-4000-8000-00000000c0c4')));
set constraints all immediate;

-- Account deletion in one transaction, including DELETE on auth.users (ADR-010).
select public.delete_my_account();

select set_config('role', 'postgres', true);

select
  current_setting('server_version_num')::int >= 150000                                     as postgres_15_or_more,
  not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where c.relkind in ('r', 'p') and n.nspname = 'public' and not c.relrowsecurity) as rls_on_all_public_tables,
  not exists (select 1 from auth.users where id = '00000000-0000-4000-8000-00000000c0c4')    as auth_user_deleted,
  not exists (select 1 from public.profiles where user_id = '00000000-0000-4000-8000-00000000c0c4') as profile_deleted,
  exists (select 1 from public.household_members
          where household_id = (select id from preflight_household)
            and status = 'anonymized' and display_name_snapshot = 'Ancien colocataire 1')     as member_anonymized,
  (select archived_at is not null from public.households where id = (select id from preflight_household)) as solo_household_archived,
  (select count(*) = 1 from public.expenses where household_id = (select id from preflight_household))   as books_kept;

rollback;
