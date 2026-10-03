-- T-0004 — activity log + atomic household bootstrap (design §7, §9.1; ADR-011, PC-1).

-- ============ activity_logs: append-only audit trail (not event sourcing) ============
create table public.activity_logs (
  id              bigint generated always as identity primary key,
  household_id    uuid not null references public.households (id),
  actor_member_id uuid,                                  -- NULL = system action
  action          text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  entity_type     text not null,
  entity_id       uuid,
  summary         jsonb not null default '{}'::jsonb,    -- ids and amounts only, no free text
  created_at      timestamptz not null default now(),
  foreign key (household_id, actor_member_id)
    references public.household_members (household_id, id)
);

create index activity_logs_household_created_idx
  on public.activity_logs (household_id, created_at desc);

alter table public.activity_logs enable row level security;
revoke all on public.activity_logs from anon, authenticated;
grant select on public.activity_logs to authenticated;

create policy activity_logs_select_active_member on public.activity_logs
  for select to authenticated
  using ((select private.is_active_member(household_id)));

-- ============ create_household(name, timezone) → household id ============
-- One transaction: household + active owner membership + activity entry.
-- The creator is always auth.uid(); no user id is accepted from the caller.
-- Errors are raised with a stable message code that the app maps to French.
create function public.create_household(p_name text, p_timezone text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_display_name text;
  v_household_id uuid;
  v_member_id uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  if char_length(v_name) not between 1 and 60 then
    raise exception 'INVALID_NAME' using errcode = '22023';
  end if;
  if p_timezone is null
     or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'INVALID_TIMEZONE' using errcode = '22023';
  end if;

  select p.display_name into v_display_name from public.profiles p where p.user_id = v_uid;
  if v_display_name is null then
    raise exception 'PROFILE_REQUIRED' using errcode = 'P0001';
  end if;

  insert into public.households (name, timezone)
  values (v_name, p_timezone)
  returning id into v_household_id;

  insert into public.household_members (household_id, user_id, display_name_snapshot, role, status)
  values (v_household_id, v_uid, v_display_name, 'owner', 'active')
  returning id into v_member_id;

  insert into public.activity_logs (household_id, actor_member_id, action, entity_type, entity_id)
  values (v_household_id, v_member_id, 'household.created', 'household', v_household_id);

  return v_household_id;
end $$;

revoke all on function public.create_household(text, text) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;
