-- T-0003 — households and household members (design §7, §8; ADR-002, ADR-003).
-- household_members.id is the permanent historical identity; user_id is only the
-- current access link. All writes go through RPCs (later tickets): no direct
-- INSERT/UPDATE/DELETE grants for API roles.

create type public.member_role as enum ('owner', 'member');
create type public.member_status as enum ('active', 'left', 'anonymized');

-- ============ households ============
create table public.households (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null
    check (char_length(name) between 1 and 60 and name = btrim(name)),
  currency              char(3) not null default 'EUR' check (currency = 'EUR'),  -- ADR-009 (M1)
  timezone              text not null,          -- IANA name, validated by the creating RPC
  anonymized_member_seq integer not null default 0 check (anonymized_member_seq >= 0),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  archived_at           timestamptz
);

create trigger households_set_updated_at before update on public.households
  for each row execute function private.set_updated_at();

-- ============ household_members ============
create table public.household_members (
  id                    uuid primary key default gen_random_uuid(),
  household_id          uuid not null references public.households (id) on delete restrict,
  -- RESTRICT (PC-2): an auth account cannot be deleted before the explicit
  -- anonymization procedure has detached it from every membership.
  user_id               uuid references auth.users (id) on delete restrict,
  display_name_snapshot text not null
    check (char_length(display_name_snapshot) between 1 and 60
           and display_name_snapshot = btrim(display_name_snapshot)),
  role                  public.member_role not null default 'member',
  status                public.member_status not null default 'active',
  joined_at             timestamptz not null default now(),
  left_at               timestamptz,
  anonymized_at         timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- Target of every composite (household_id, member_id) foreign key (§9.3).
  constraint household_members_household_id_id_key unique (household_id, id),
  -- NULLs are distinct: several anonymized members may coexist.
  constraint household_members_household_id_user_id_key unique (household_id, user_id),

  constraint household_members_active_shape check (
    status <> 'active' or (user_id is not null and left_at is null and anonymized_at is null)),
  constraint household_members_left_shape check (
    status <> 'left' or (left_at is not null and anonymized_at is null)),
  constraint household_members_anonymized_shape check (
    status <> 'anonymized' or (user_id is null and anonymized_at is not null)),
  -- A user_id may only be absent once anonymized.
  constraint household_members_user_link_shape check (
    user_id is not null or status = 'anonymized'),
  constraint household_members_owner_is_active check (role <> 'owner' or status = 'active')
);

create unique index household_members_one_owner_idx
  on public.household_members (household_id) where role = 'owner';
create index household_members_active_user_idx
  on public.household_members (user_id, household_id) where status = 'active';

create trigger household_members_set_updated_at before update on public.household_members
  for each row execute function private.set_updated_at();

-- ============ RLS helpers (§8.1) ============
-- SECURITY DEFINER so the household_members policy can call them without recursion.
-- They live in the non-exposed private schema.
create function private.is_active_member(p_household_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = p_household_id
      and m.user_id = (select auth.uid())
      and m.status = 'active');
$$;

create function private.current_member_id(p_household_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id from public.household_members m
  where m.household_id = p_household_id
    and m.user_id = (select auth.uid())
    and m.status = 'active';
$$;

revoke all on function private.is_active_member(uuid) from public, anon;
revoke all on function private.current_member_id(uuid) from public, anon;
grant execute on function private.is_active_member(uuid) to authenticated;
grant execute on function private.current_member_id(uuid) to authenticated;

-- ============ grants + policies: SELECT only ============
alter table public.households enable row level security;
alter table public.household_members enable row level security;

revoke all on public.households, public.household_members from anon, authenticated;
grant select on public.households, public.household_members to authenticated;

create policy households_select_active_member on public.households
  for select to authenticated
  using ((select private.is_active_member(id)));

create policy household_members_select_active_member on public.household_members
  for select to authenticated
  using ((select private.is_active_member(household_id)));

-- ============ display name snapshot follows the profile while active (§5.4) ============
-- Former members keep a frozen snapshot; anonymized members are never linked.
create function private.sync_member_display_names() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.household_members
     set display_name_snapshot = new.display_name
   where user_id = new.user_id
     and status = 'active'
     and display_name_snapshot is distinct from new.display_name;
  return null;
end $$;

revoke all on function private.sync_member_display_names() from public, anon, authenticated;

create trigger profiles_sync_member_display_names
  after update of display_name on public.profiles
  for each row execute function private.sync_member_display_names();
