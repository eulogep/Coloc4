-- T-0002 — private helper schema + private user profiles (design §7, §8).

-- ============ private schema (never exposed through the Data API) ============
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ============ profiles: readable and writable by their owner only ============
create table public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (char_length(display_name) between 1 and 40 and display_name = btrim(display_name)),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (user_id, display_name) on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
