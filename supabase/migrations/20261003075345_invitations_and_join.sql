-- T-0005 — invitations and atomic join (design §9.2, §9.3; ADR-006, PC-4, PC-5, OD-03, OD-07, OD-08, OD-11).
-- Raw tokens are never stored: only sha256(token). The caller identity always
-- comes from auth.uid(); no user id is accepted from the client.

-- ============ household_invitations ============
create table public.household_invitations (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references public.households (id),
  token_hash           bytea not null unique check (octet_length(token_hash) = 32),
  created_by_member_id uuid not null,
  expires_at           timestamptz not null,
  max_uses             integer not null check (max_uses between 1 and 50),
  use_count            integer not null default 0 check (use_count >= 0 and use_count <= max_uses),
  revoked_at           timestamptz,
  created_at           timestamptz not null default now(),
  foreign key (household_id, created_by_member_id)
    references public.household_members (household_id, id)
);

create index household_invitations_household_idx on public.household_invitations (household_id);

alter table public.household_invitations enable row level security;
revoke all on public.household_invitations from anon, authenticated;
-- Members may list invitations but never read token_hash.
grant select (id, household_id, created_by_member_id, expires_at, max_uses, use_count, revoked_at, created_at)
  on public.household_invitations to authenticated;

create policy household_invitations_select_active_member on public.household_invitations
  for select to authenticated
  using ((select private.is_active_member(household_id)));

-- ============ per-user attempt log for token lookups (PC-5) ============
create table private.invitation_attempts (
  user_id      uuid not null,
  attempted_at timestamptz not null default now()
);
create index invitation_attempts_user_time_idx on private.invitation_attempts (user_id, attempted_at);
revoke all on private.invitation_attempts from public, anon, authenticated;

-- Records one attempt; returns false when the caller is over the limit
-- (20 token lookups per 10 minutes per user).
create function private.consume_invitation_attempt(p_user_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  delete from private.invitation_attempts
   where user_id = p_user_id and attempted_at < now() - interval '10 minutes';
  if (select count(*) from private.invitation_attempts where user_id = p_user_id) >= 20 then
    return false;
  end if;
  insert into private.invitation_attempts (user_id) values (p_user_id);
  return true;
end $$;
revoke all on function private.consume_invitation_attempt(uuid) from public, anon, authenticated;

create function private.hash_invitation_token(p_token text) returns bytea
language sql immutable set search_path = '' as $$
  select pg_catalog.sha256(convert_to(p_token, 'UTF8'));
$$;
revoke all on function private.hash_invitation_token(text) from public, anon, authenticated;

-- ============ create_invitation(household) → raw token (returned once) ============
create function public.create_invitation(p_household_id uuid)
returns table (invitation_id uuid, token text, expires_at timestamptz, max_uses integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := private.current_member_id(p_household_id);
  v_token text;
  v_invitation public.household_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  if v_actor is null then
    raise exception 'NOT_A_MEMBER' using errcode = '42501';
  end if;
  if exists (select 1 from public.households h where h.id = p_household_id and h.archived_at is not null) then
    raise exception 'HOUSEHOLD_ARCHIVED' using errcode = 'P0001';
  end if;

  -- 256 bits, base64url without padding (43 chars).
  v_token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');

  insert into public.household_invitations (household_id, token_hash, created_by_member_id, expires_at, max_uses)
  values (p_household_id, private.hash_invitation_token(v_token), v_actor, now() + interval '7 days', 10)
  returning * into v_invitation;

  insert into public.activity_logs (household_id, actor_member_id, action, entity_type, entity_id)
  values (p_household_id, v_actor, 'invitation.created', 'invitation', v_invitation.id);

  return query select v_invitation.id, v_token, v_invitation.expires_at, v_invitation.max_uses;
end $$;

-- ============ revoke_invitation(invitation) ============
create function public.revoke_invitation(p_invitation_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_invitation public.household_invitations%rowtype;
  v_actor uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  select * into v_invitation from public.household_invitations where id = p_invitation_id for update;
  v_actor := private.current_member_id(v_invitation.household_id);
  if v_invitation.id is null or v_actor is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_invitation.revoked_at is not null then
    return;  -- idempotent
  end if;

  update public.household_invitations set revoked_at = now() where id = p_invitation_id;
  insert into public.activity_logs (household_id, actor_member_id, action, entity_type, entity_id)
  values (v_invitation.household_id, v_actor, 'invitation.revoked', 'invitation', p_invitation_id);
end $$;

-- ============ preview_invitation(token) → status (+ name only when joinable) ============
create function public.preview_invitation(p_token text)
returns table (result_code text, household_name text, target_household_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_invitation public.household_invitations%rowtype;
  v_household public.households%rowtype;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  if not private.consume_invitation_attempt(v_uid) then
    return query select 'RATE_LIMITED'::text, null::text, null::uuid; return;
  end if;
  if p_token is null or char_length(p_token) <> 43 then
    return query select 'INVALID'::text, null::text, null::uuid; return;
  end if;

  select * into v_invitation from public.household_invitations
   where token_hash = private.hash_invitation_token(p_token);
  if v_invitation.id is null then
    return query select 'INVALID'::text, null::text, null::uuid; return;
  end if;
  select * into v_household from public.households where id = v_invitation.household_id;
  if v_household.archived_at is not null then
    return query select 'INVALID'::text, null::text, null::uuid; return;
  end if;
  if exists (select 1 from public.household_members m
             where m.household_id = v_household.id and m.user_id = v_uid and m.status = 'active') then
    return query select 'ALREADY_MEMBER'::text, v_household.name, v_household.id; return;
  end if;
  if v_invitation.revoked_at is not null then
    return query select 'REVOKED'::text, null::text, null::uuid; return;
  end if;
  if v_invitation.expires_at <= now() then
    return query select 'EXPIRED'::text, null::text, null::uuid; return;
  end if;
  if v_invitation.use_count >= v_invitation.max_uses then
    return query select 'EXHAUSTED'::text, null::text, null::uuid; return;
  end if;
  return query select 'VALID'::text, v_household.name, null::uuid;
end $$;

-- ============ join_household(token) → result code (+ household id) ============
create function public.join_household(p_token text)
returns table (result_code text, target_household_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_invitation public.household_invitations%rowtype;
  v_household public.households%rowtype;
  v_member public.household_members%rowtype;
  v_display_name text;
  v_result text;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  if not private.consume_invitation_attempt(v_uid) then
    return query select 'RATE_LIMITED'::text, null::uuid; return;
  end if;
  if p_token is null or char_length(p_token) <> 43 then
    return query select 'INVALID'::text, null::uuid; return;
  end if;

  -- Row lock: concurrent joins on the same invitation are serialized here, and a
  -- waiting transaction re-reads the committed use_count once the lock is released.
  select * into v_invitation from public.household_invitations
   where token_hash = private.hash_invitation_token(p_token)
   for update;
  if v_invitation.id is null then
    return query select 'INVALID'::text, null::uuid; return;
  end if;

  select * into v_household from public.households where id = v_invitation.household_id;
  if v_household.archived_at is not null then
    return query select 'INVALID'::text, null::uuid; return;
  end if;

  select * into v_member from public.household_members
   where household_id = v_invitation.household_id and user_id = v_uid
   for update;
  -- PC-4: checked before expiry/revocation; consumes nothing.
  if v_member.id is not null and v_member.status = 'active' then
    return query select 'ALREADY_MEMBER'::text, v_invitation.household_id; return;
  end if;

  if v_invitation.revoked_at is not null then
    return query select 'REVOKED'::text, null::uuid; return;
  end if;
  if v_invitation.expires_at <= now() then
    return query select 'EXPIRED'::text, null::uuid; return;
  end if;
  if v_invitation.use_count >= v_invitation.max_uses then
    return query select 'EXHAUSTED'::text, null::uuid; return;
  end if;

  select p.display_name into v_display_name from public.profiles p where p.user_id = v_uid;
  if v_display_name is null then
    raise exception 'PROFILE_REQUIRED' using errcode = 'P0001';
  end if;

  if v_member.id is not null and v_member.status = 'left' then
    -- §5.8: same auth account returns → same historical identity.
    update public.household_members
       set status = 'active', left_at = null, display_name_snapshot = v_display_name
     where id = v_member.id;
    v_result := 'REACTIVATED';
  else
    -- Anonymized rows have user_id NULL and never match above: a new identity.
    insert into public.household_members (household_id, user_id, display_name_snapshot)
    values (v_invitation.household_id, v_uid, v_display_name)
    returning * into v_member;
    v_result := 'JOINED';
  end if;

  update public.household_invitations set use_count = use_count + 1 where id = v_invitation.id;

  insert into public.activity_logs (household_id, actor_member_id, action, entity_type, entity_id, summary)
  values (v_invitation.household_id, v_member.id, 'member.' || lower(v_result), 'household_member', v_member.id,
          jsonb_build_object('invitation_id', v_invitation.id));

  return query select v_result, v_invitation.household_id;
end $$;

revoke all on function public.create_invitation(uuid) from public, anon;
revoke all on function public.revoke_invitation(uuid) from public, anon;
revoke all on function public.preview_invitation(text) from public, anon;
revoke all on function public.join_household(text) from public, anon;
grant execute on function public.create_invitation(uuid) to authenticated;
grant execute on function public.revoke_invitation(uuid) to authenticated;
grant execute on function public.preview_invitation(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;
