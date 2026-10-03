-- T-0008 — money persistence (design §4, §7, §9.4, §9.5; ADR-004, ADR-009; PC-3, PC-9, PC-11).
-- Amounts are bigint cents. They cross the API as TEXT (RPC parameters and the
-- balance view) so they never become JavaScript numbers.

create type public.split_mode as enum ('equal', 'exact');

-- ============ expenses ============
create table public.expenses (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references public.households (id),
  title                text not null check (char_length(title) between 1 and 80 and title = btrim(title)),
  amount_minor         bigint not null check (amount_minor > 0 and amount_minor <= 100000000),
  paid_by_member_id    uuid not null,
  split_mode           public.split_mode not null,
  spent_on             date not null,
  created_by_member_id uuid not null,
  deleted_at           timestamptz,
  deleted_by_member_id uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint expenses_household_id_id_key unique (household_id, id),
  foreign key (household_id, paid_by_member_id)    references public.household_members (household_id, id),
  foreign key (household_id, created_by_member_id) references public.household_members (household_id, id),
  foreign key (household_id, deleted_by_member_id) references public.household_members (household_id, id),
  constraint expenses_deleted_pair check ((deleted_at is null) = (deleted_by_member_id is null))
);

create index expenses_household_spent_idx on public.expenses (household_id, spent_on desc, created_at desc);
create index expenses_household_payer_idx on public.expenses (household_id, paid_by_member_id);

create trigger expenses_set_updated_at before update on public.expenses
  for each row execute function private.set_updated_at();

-- ============ expense_shares (stored truth of who owes what) ============
create table public.expense_shares (
  expense_id         uuid not null,
  household_id       uuid not null,
  member_id          uuid not null,
  share_amount_minor bigint not null check (share_amount_minor >= 0),
  primary key (expense_id, member_id),
  foreign key (household_id, expense_id) references public.expenses (household_id, id) on delete cascade,
  foreign key (household_id, member_id)  references public.household_members (household_id, id)
);

create index expense_shares_household_member_idx on public.expense_shares (household_id, member_id);

-- ============ settlements ("I already paid this roommate outside Coloc4") ============
create table public.settlements (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references public.households (id),
  from_member_id       uuid not null,
  to_member_id         uuid not null,
  amount_minor         bigint not null check (amount_minor > 0 and amount_minor <= 100000000),
  settled_on           date not null,
  created_by_member_id uuid not null,
  deleted_at           timestamptz,
  deleted_by_member_id uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint settlements_not_self check (from_member_id <> to_member_id),
  foreign key (household_id, from_member_id)       references public.household_members (household_id, id),
  foreign key (household_id, to_member_id)         references public.household_members (household_id, id),
  foreign key (household_id, created_by_member_id) references public.household_members (household_id, id),
  foreign key (household_id, deleted_by_member_id) references public.household_members (household_id, id),
  constraint settlements_deleted_pair check ((deleted_at is null) = (deleted_by_member_id is null))
);

create index settlements_household_idx on public.settlements (household_id, settled_on desc);

create trigger settlements_set_updated_at before update on public.settlements
  for each row execute function private.set_updated_at();

-- ============ invariant: SUM(shares) = amount, checked at COMMIT (§9.5) ============
create function private.assert_expense_balanced(p_expense_id uuid) returns void
language plpgsql set search_path = '' as $$
declare
  v_amount bigint;
  v_sum numeric;
  v_positive integer;
begin
  select e.amount_minor into v_amount from public.expenses e where e.id = p_expense_id;
  if not found then
    return;  -- hard-deleted together with its shares
  end if;
  select coalesce(sum(s.share_amount_minor), 0), count(*) filter (where s.share_amount_minor > 0)
    into v_sum, v_positive
    from public.expense_shares s
   where s.expense_id = p_expense_id;
  if v_sum <> v_amount or v_positive = 0 then
    raise exception 'EXPENSE_SHARES_MISMATCH: expense % shares % amount %', p_expense_id, v_sum, v_amount
      using errcode = '23514';
  end if;
end $$;

create function private.trg_expense_balanced() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'expenses' then
    perform private.assert_expense_balanced(new.id);
  else
    perform private.assert_expense_balanced(coalesce(new.expense_id, old.expense_id));
  end if;
  return null;
end $$;

create constraint trigger expense_shares_balanced
  after insert or update or delete on public.expense_shares
  deferrable initially deferred
  for each row execute function private.trg_expense_balanced();

create constraint trigger expenses_balanced
  after insert or update of amount_minor on public.expenses
  deferrable initially deferred
  for each row execute function private.trg_expense_balanced();

-- ============ currency is immutable once any money record exists (ADR-009, PC-3) ============
create function private.trg_households_currency_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.currency is distinct from old.currency and (
       exists (select 1 from public.expenses e where e.household_id = old.id)
    or exists (select 1 from public.settlements s where s.household_id = old.id)) then
    raise exception 'CURRENCY_IMMUTABLE' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger households_currency_immutable before update of currency on public.households
  for each row execute function private.trg_households_currency_immutable();

-- ============ RLS: read for active members, no direct writes ============
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;
alter table public.settlements enable row level security;

revoke all on public.expenses, public.expense_shares, public.settlements from anon, authenticated;
grant select on public.expenses, public.expense_shares, public.settlements to authenticated;

create policy expenses_select_active_member on public.expenses
  for select to authenticated using ((select private.is_active_member(household_id)));
create policy expense_shares_select_active_member on public.expense_shares
  for select to authenticated using ((select private.is_active_member(household_id)));
create policy settlements_select_active_member on public.settlements
  for select to authenticated using ((select private.is_active_member(household_id)));

-- ============ balances: computed from history, never stored (§4.9) ============
create function private.member_net(p_household_id uuid, p_member_id uuid) returns numeric
language sql stable set search_path = '' as $$
  select
      coalesce((select sum(e.amount_minor) from public.expenses e
                where e.household_id = p_household_id and e.paid_by_member_id = p_member_id
                  and e.deleted_at is null), 0)
    - coalesce((select sum(s.share_amount_minor) from public.expense_shares s
                join public.expenses e on e.id = s.expense_id
                where s.household_id = p_household_id and s.member_id = p_member_id
                  and e.deleted_at is null), 0)
    + coalesce((select sum(t.amount_minor) from public.settlements t
                where t.household_id = p_household_id and t.from_member_id = p_member_id
                  and t.deleted_at is null), 0)
    - coalesce((select sum(t.amount_minor) from public.settlements t
                where t.household_id = p_household_id and t.to_member_id = p_member_id
                  and t.deleted_at is null), 0);
$$;

-- security_invoker: the caller's RLS applies to every table read by the view.
create view public.member_balances with (security_invoker = true) as
select
  m.household_id,
  m.id as member_id,
  m.display_name_snapshot,
  m.status,
  private.member_net(m.household_id, m.id)::text as net_minor
from public.household_members m;

revoke all on public.member_balances from anon, authenticated;
grant select on public.member_balances to authenticated;
grant execute on function private.member_net(uuid, uuid) to authenticated;

-- ============ helpers for write RPCs ============
create function private.parse_amount_minor(p_amount text) returns bigint
language plpgsql immutable set search_path = '' as $$
begin
  if p_amount is null or p_amount !~ '^[0-9]{1,12}$' then
    raise exception 'INVALID_AMOUNT' using errcode = '22023';
  end if;
  if p_amount::bigint <= 0 or p_amount::bigint > 100000000 then
    raise exception 'INVALID_AMOUNT' using errcode = '22023';
  end if;
  return p_amount::bigint;
end $$;

-- Same rule as splitEqual (TS): floor(amount / n), remainder one cent at a time
-- in uuid order (bytewise = canonical lowercase hex order).
create function private.equal_split(p_amount bigint, p_members uuid[])
returns table (member_id uuid, share_amount_minor bigint)
language sql immutable set search_path = '' as $$
  with ordered as (
    select m, row_number() over (order by m) - 1 as idx, count(*) over () as n
    from unnest(p_members) as m
  )
  select m, p_amount / n + case when idx < p_amount % n then 1 else 0 end
  from ordered;
$$;

create function private.require_household_writable(p_household_id uuid) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  v_actor uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  v_actor := private.current_member_id(p_household_id);
  if v_actor is null then
    raise exception 'NOT_A_MEMBER' using errcode = '42501';
  end if;
  if exists (select 1 from public.households h where h.id = p_household_id and h.archived_at is not null) then
    raise exception 'HOUSEHOLD_ARCHIVED' using errcode = 'P0001';
  end if;
  return v_actor;
end $$;

-- Builds and validates the shares of an expense.
-- p_participants: equal → ["<member uuid>", ...]; exact → [{"memberId": "...", "amountMinor": "123"}, ...]
-- p_allowed_inactive: members that may be kept although no longer active (edits, PC-9).
create function private.build_expense_shares(
  p_household_id uuid,
  p_amount bigint,
  p_split_mode public.split_mode,
  p_participants jsonb,
  p_allowed_inactive uuid[]
) returns table (member_id uuid, share_amount_minor bigint)
language plpgsql security definer set search_path = '' as $$
declare
  v_members uuid[];
  v_shares bigint[];
  v_item jsonb;
begin
  if p_participants is null or jsonb_typeof(p_participants) <> 'array' or jsonb_array_length(p_participants) = 0 then
    raise exception 'INVALID_PARTICIPANTS' using errcode = '22023';
  end if;

  if p_split_mode = 'equal' then
    for v_item in select * from jsonb_array_elements(p_participants) loop
      if jsonb_typeof(v_item) <> 'string' or (v_item #>> '{}') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception 'INVALID_PARTICIPANTS' using errcode = '22023';
      end if;
      v_members := v_members || (v_item #>> '{}')::uuid;
    end loop;
  else
    for v_item in select * from jsonb_array_elements(p_participants) loop
      if jsonb_typeof(v_item) <> 'object'
         or coalesce(v_item ->> 'memberId', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         or jsonb_typeof(v_item -> 'amountMinor') is distinct from 'string'
         or (v_item ->> 'amountMinor') !~ '^[0-9]{1,12}$' then
        raise exception 'INVALID_PARTICIPANTS' using errcode = '22023';
      end if;
      v_members := v_members || (v_item ->> 'memberId')::uuid;
      v_shares := v_shares || (v_item ->> 'amountMinor')::bigint;
    end loop;
  end if;

  if (select count(distinct m) from unnest(v_members) m) <> cardinality(v_members) then
    raise exception 'DUPLICATE_PARTICIPANT' using errcode = '22023';
  end if;

  -- Every participant: member of this household, active (or explicitly allowed).
  if exists (
    select 1 from unnest(v_members) as p(id)
    left join public.household_members m on m.id = p.id and m.household_id = p_household_id
    where m.id is null
       or (m.status <> 'active' and not (p.id = any (coalesce(p_allowed_inactive, '{}'))))
  ) then
    raise exception 'INVALID_PARTICIPANTS' using errcode = '22023';
  end if;

  if p_split_mode = 'equal' then
    return query select * from private.equal_split(p_amount, v_members);
    return;
  end if;

  if (select coalesce(sum(s), 0) from unnest(v_shares) s) <> p_amount then
    raise exception 'SUM_MISMATCH' using errcode = '22023';
  end if;
  if not exists (select 1 from unnest(v_shares) s where s > 0) then
    raise exception 'ALL_ZERO' using errcode = '22023';
  end if;
  return query select m, s from unnest(v_members, v_shares) as u(m, s);
end $$;

create function private.normalize_title(p_title text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  v_title text := regexp_replace(btrim(coalesce(p_title, '')), '\s+', ' ', 'g');
begin
  if char_length(v_title) not between 1 and 80 then
    raise exception 'INVALID_TITLE' using errcode = '22023';
  end if;
  return v_title;
end $$;

create function private.require_valid_date(p_date date) returns date
language plpgsql stable set search_path = '' as $$
begin
  if p_date is null or p_date < date '2000-01-01' or p_date > current_date + 1 then
    raise exception 'INVALID_DATE' using errcode = '22023';
  end if;
  return p_date;
end $$;

-- ============ create_expense (§4.15): expense + shares + activity, atomically ============
create function public.create_expense(
  p_household_id uuid,
  p_title text,
  p_amount_minor text,
  p_paid_by_member_id uuid,
  p_split_mode public.split_mode,
  p_spent_on date,
  p_participants jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := private.require_household_writable(p_household_id);
  v_title text := private.normalize_title(p_title);
  v_amount bigint := private.parse_amount_minor(p_amount_minor);
  v_spent_on date := private.require_valid_date(p_spent_on);
  v_expense_id uuid;
  v_count integer;
begin
  if p_split_mode is null then
    raise exception 'INVALID_SPLIT_MODE' using errcode = '22023';
  end if;
  if not exists (select 1 from public.household_members m
                 where m.id = p_paid_by_member_id and m.household_id = p_household_id and m.status = 'active') then
    raise exception 'INVALID_PAYER' using errcode = '22023';
  end if;

  insert into public.expenses (household_id, title, amount_minor, paid_by_member_id, split_mode, spent_on, created_by_member_id)
  values (p_household_id, v_title, v_amount, p_paid_by_member_id, p_split_mode, v_spent_on, v_actor)
  returning id into v_expense_id;

  insert into public.expense_shares (expense_id, household_id, member_id, share_amount_minor)
  select v_expense_id, p_household_id, s.member_id, s.share_amount_minor
  from private.build_expense_shares(p_household_id, v_amount, p_split_mode, p_participants, '{}') s;
  get diagnostics v_count = row_count;

  insert into public.activity_logs (household_id, actor_member_id, action, entity_type, entity_id, summary)
  values (p_household_id, v_actor, 'expense.created', 'expense', v_expense_id,
          jsonb_build_object('amount_minor', v_amount::text, 'participant_count', v_count));

  return v_expense_id;
end $$;

-- ============ update_expense: replaces fields and shares atomically (PC-9) ============
create function public.update_expense(
  p_expense_id uuid,
  p_title text,
  p_amount_minor text,
  p_paid_by_member_id uuid,
  p_split_mode public.split_mode,
  p_spent_on date,
  p_participants jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_expense public.expenses%rowtype;
  v_actor uuid;
  v_title text := private.normalize_title(p_title);
  v_amount bigint := private.parse_amount_minor(p_amount_minor);
  v_spent_on date := private.require_valid_date(p_spent_on);
  v_previous uuid[];
begin
  select * into v_expense from public.expenses where id = p_expense_id for update;
  if v_expense.id is null or private.current_member_id(v_expense.household_id) is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  v_actor := private.require_household_writable(v_expense.household_id);
  if v_expense.deleted_at is not null then
    raise exception 'EXPENSE_DELETED' using errcode = 'P0001';
  end if;
  if p_split_mode is null then
    raise exception 'INVALID_SPLIT_MODE' using errcode = '22023';
  end if;

  -- Already-involved members may stay even if they left; new ones must be active.
  select array_agg(s.member_id) into v_previous from public.expense_shares s where s.expense_id = p_expense_id;
  if not exists (select 1 from public.household_members m
                 where m.id = p_paid_by_member_id and m.household_id = v_expense.household_id
                   and (m.status = 'active' or m.id = v_expense.paid_by_member_id)) then
    raise exception 'INVALID_PAYER' using errcode = '22023';
  end if;

  update public.expenses
     set title = v_title, amount_minor = v_amount, paid_by_member_id = p_paid_by_member_id,
         split_mode = p_split_mode, spent_on = v_spent_on
   where id = p_expense_id;

  delete from public.expense_shares where expense_id = p_expense_id;
  insert into public.expense_shares (expense_id, household_id, member_id, share_amount_minor)
  select p_expense_id, v_expense.household_id, s.member_id, s.share_amount_minor
  from private.build_expense_shares(v_expense.household_id, v_amount, p_split_mode, p_participants, v_previous) s;

  insert into public.activity_logs (household_id, actor_member_id, action, entity_type, entity_id, summary)
  values (v_expense.household_id, v_actor, 'expense.updated', 'expense', p_expense_id,
          jsonb_build_object('old_amount_minor', v_expense.amount_minor::text, 'new_amount_minor', v_amount::text));
end $$;

-- ============ delete_expense: soft delete (§4.14) ============
create function public.delete_expense(p_expense_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_expense public.expenses%rowtype;
  v_actor uuid;
begin
  select * into v_expense from public.expenses where id = p_expense_id for update;
  if v_expense.id is null or private.current_member_id(v_expense.household_id) is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  v_actor := private.require_household_writable(v_expense.household_id);
  if v_expense.deleted_at is not null then
    return;  -- idempotent
  end if;

  update public.expenses set deleted_at = now(), deleted_by_member_id = v_actor where id = p_expense_id;
  insert into public.activity_logs (household_id, actor_member_id, action, entity_type, entity_id, summary)
  values (v_expense.household_id, v_actor, 'expense.deleted', 'expense', p_expense_id,
          jsonb_build_object('amount_minor', v_expense.amount_minor::text));
end $$;

-- ============ record_settlement (§4.12, §4.13, §9.5) ============
-- Signs: the sender's net goes up, the receiver's net goes down.
-- A former/anonymized member may only settle historical balances; a settlement that
-- would push their balance through zero needs p_confirm_overshoot.
create function public.record_settlement(
  p_household_id uuid,
  p_from_member_id uuid,
  p_to_member_id uuid,
  p_amount_minor text,
  p_settled_on date,
  p_confirm_overshoot boolean default false
) returns table (result_code text, settlement_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := private.require_household_writable(p_household_id);
  v_amount bigint := private.parse_amount_minor(p_amount_minor);
  v_settled_on date := private.require_valid_date(p_settled_on);
  v_from public.household_members%rowtype;
  v_to public.household_members%rowtype;
  v_net numeric;
  v_id uuid;
begin
  if p_from_member_id is null or p_to_member_id is null or p_from_member_id = p_to_member_id then
    raise exception 'INVALID_MEMBERS' using errcode = '22023';
  end if;
  select * into v_from from public.household_members where id = p_from_member_id and household_id = p_household_id;
  select * into v_to from public.household_members where id = p_to_member_id and household_id = p_household_id;
  if v_from.id is null or v_to.id is null then
    raise exception 'INVALID_MEMBERS' using errcode = '22023';
  end if;
  -- ASSUMPTION A-03: the recording member is one of the two parties.
  if v_actor not in (p_from_member_id, p_to_member_id) then
    raise exception 'ACTOR_NOT_INVOLVED' using errcode = '42501';
  end if;

  -- Serialize settlements per household so the overshoot check sees committed balances.
  perform 1 from public.households where id = p_household_id for no key update;

  if not p_confirm_overshoot then
    if v_from.status <> 'active' then
      v_net := private.member_net(p_household_id, p_from_member_id);
      if v_net + v_amount > 0 then
        return query select 'CONFIRMATION_REQUIRED'::text, null::uuid; return;
      end if;
    end if;
    if v_to.status <> 'active' then
      v_net := private.member_net(p_household_id, p_to_member_id);
      if v_net - v_amount < 0 then
        return query select 'CONFIRMATION_REQUIRED'::text, null::uuid; return;
      end if;
    end if;
  end if;

  insert into public.settlements (household_id, from_member_id, to_member_id, amount_minor, settled_on, created_by_member_id)
  values (p_household_id, p_from_member_id, p_to_member_id, v_amount, v_settled_on, v_actor)
  returning id into v_id;

  insert into public.activity_logs (household_id, actor_member_id, action, entity_type, entity_id, summary)
  values (p_household_id, v_actor, 'settlement.recorded', 'settlement', v_id,
          jsonb_build_object('amount_minor', v_amount::text));

  return query select 'RECORDED'::text, v_id;
end $$;

-- ============ delete_settlement: soft delete ============
create function public.delete_settlement(p_settlement_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_settlement public.settlements%rowtype;
  v_actor uuid;
begin
  select * into v_settlement from public.settlements where id = p_settlement_id for update;
  if v_settlement.id is null or private.current_member_id(v_settlement.household_id) is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  v_actor := private.require_household_writable(v_settlement.household_id);
  if v_settlement.deleted_at is not null then
    return;
  end if;

  update public.settlements set deleted_at = now(), deleted_by_member_id = v_actor where id = p_settlement_id;
  insert into public.activity_logs (household_id, actor_member_id, action, entity_type, entity_id, summary)
  values (v_settlement.household_id, v_actor, 'settlement.deleted', 'settlement', p_settlement_id,
          jsonb_build_object('amount_minor', v_settlement.amount_minor::text));
end $$;

-- ============ privileges ============
revoke all on function private.assert_expense_balanced(uuid) from public, anon, authenticated;
revoke all on function private.parse_amount_minor(text) from public, anon, authenticated;
revoke all on function private.equal_split(bigint, uuid[]) from public, anon, authenticated;
revoke all on function private.require_household_writable(uuid) from public, anon, authenticated;
revoke all on function private.build_expense_shares(uuid, bigint, public.split_mode, jsonb, uuid[]) from public, anon, authenticated;
revoke all on function private.normalize_title(text) from public, anon, authenticated;
revoke all on function private.require_valid_date(date) from public, anon, authenticated;

revoke all on function public.create_expense(uuid, text, text, uuid, public.split_mode, date, jsonb) from public, anon;
revoke all on function public.update_expense(uuid, text, text, uuid, public.split_mode, date, jsonb) from public, anon;
revoke all on function public.delete_expense(uuid) from public, anon;
revoke all on function public.record_settlement(uuid, uuid, uuid, text, date, boolean) from public, anon;
revoke all on function public.delete_settlement(uuid) from public, anon;
grant execute on function public.create_expense(uuid, text, text, uuid, public.split_mode, date, jsonb) to authenticated;
grant execute on function public.update_expense(uuid, text, text, uuid, public.split_mode, date, jsonb) to authenticated;
grant execute on function public.delete_expense(uuid) to authenticated;
grant execute on function public.record_settlement(uuid, uuid, uuid, text, date, boolean) to authenticated;
grant execute on function public.delete_settlement(uuid) to authenticated;
