-- §11.7: every table in an API-exposed schema must have RLS enabled.
-- Keep this list in sync with [api].schemas in supabase/config.toml.
begin;
select plan(1);

select is_empty(
  $$
    select n.nspname || '.' || c.relname
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p')
      and n.nspname in ('public', 'graphql_public')
      and not c.relrowsecurity
  $$,
  'all tables in exposed schemas have RLS enabled'
);

select * from finish();
rollback;
