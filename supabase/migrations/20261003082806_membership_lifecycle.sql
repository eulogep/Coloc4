-- T-0012 — membership lifecycle: leave, transfer ownership, archive, delete account
-- (design §5.7, §5.8, §10.1–§10.3, §11.1; ADR-010, PC-2).
-- Rejoining after leaving is handled by join_household (REACTIVATED, same row).

-- ============ leave_household ============
-- Leaving with a non-zero balance is allowed; history is never reassigned.
create function public.leave_household(p_household_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := private.current_member_id(p_household_id);
  v_role public.member_role;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  if v_actor is null then
    raise exception 'NOT_A_MEMBER' using errcode = '42501';
  end if;
  select role into v_role from public.household_members where id = v_actor for update;
  if v_role = 'owner' then
    raise exception 'OWNER_MUST_TRANSFER' using errcode = 'P0001';
  end if;

  update public.household_members set status = 'left', left_at = now() where id = v_actor;
  insert into public.activity_logs (household_id, actor_member_id, action, entity_type, entity_id)
  values (p_household_id, v_actor, 'member.left', 'household_member', v_actor);
end $$;

-- ============ transfer_ownership ============
create function public.transfer_ownership(p_household_id uuid, p_to_member_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := private.require_household_writable(p_household_id);
begin
  if not exists (select 1 from public.household_members where id = v_actor and role = 'owner') then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;
  if p_to_member_id is null or p_to_member_id = v_actor or not exists (
       select 1 from public.household_members
       where id = p_to_member_id and household_id = p_household_id and status = 'active') then
    raise exception 'INVALID_MEMBER' using errcode = '22023';
  end if;

  -- Demote first: the one-owner unique index holds after each statement.
  update public.household_members set role = 'member' where id = v_actor;
  update public.household_members set role = 'owner' where id = p_to_member_id;
  insert into public.activity_logs (household_id, actor_member_id, action, entity_type, entity_id)
  values (p_household_id, v_actor, 'household.ownership_transferred', 'household_member', p_to_member_id);
end $$;

-- ============ archive_household (§10.3: archive first, no hard delete) ============
create function public.archive_household(p_household_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := private.require_household_writable(p_household_id);
begin
  if not exists (select 1 from public.household_members where id = v_actor and role = 'owner') then
    raise exception 'NOT_OWNER' using errcode = '42501';
  end if;
  update public.households set archived_at = now() where id = p_household_id;
  update public.household_invitations set revoked_at = now()
   where household_id = p_household_id and revoked_at is null;
  insert into public.activity_logs (household_id, actor_member_id, action, entity_type, entity_id)
  values (p_household_id, v_actor, 'household.archived', 'household', p_household_id);
end $$;

-- ============ delete_my_account (ADR-010) ============
-- One transaction: every membership of the caller is anonymized ("Ancien
-- colocataire N", per-household counter), the private profile is deleted, then
-- the auth account itself. Financial history stays coherent for the others.
-- An owner who still has active roommates must transfer ownership first; an
-- owner alone in a household archives it.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_member public.household_members%rowtype;
  v_seq integer;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  if exists (
    select 1 from public.household_members m
    where m.user_id = v_uid and m.role = 'owner'
      and exists (select 1 from public.household_members o
                  where o.household_id = m.household_id and o.id <> m.id and o.status = 'active')
  ) then
    raise exception 'OWNER_MUST_TRANSFER' using errcode = 'P0001';
  end if;

  for v_member in
    select * from public.household_members where user_id = v_uid order by household_id for update
  loop
    if v_member.role = 'owner' then
      update public.households set archived_at = coalesce(archived_at, now()) where id = v_member.household_id;
      update public.household_invitations set revoked_at = now()
       where household_id = v_member.household_id and revoked_at is null;
    end if;

    update public.households set anonymized_member_seq = anonymized_member_seq + 1
     where id = v_member.household_id
    returning anonymized_member_seq into v_seq;

    update public.household_members
       set user_id = null,
           role = 'member',
           status = 'anonymized',
           left_at = coalesce(left_at, now()),
           anonymized_at = now(),
           display_name_snapshot = 'Ancien colocataire ' || v_seq
     where id = v_member.id;

    insert into public.activity_logs (household_id, actor_member_id, action, entity_type, entity_id)
    values (v_member.household_id, null, 'member.anonymized', 'household_member', v_member.id);
  end loop;

  delete from private.invitation_attempts where user_id = v_uid;
  delete from public.profiles where user_id = v_uid;
  -- Sessions, identities and refresh tokens cascade from auth.users.
  delete from auth.users where id = v_uid;
end $$;

revoke all on function public.leave_household(uuid) from public, anon;
revoke all on function public.transfer_ownership(uuid, uuid) from public, anon;
revoke all on function public.archive_household(uuid) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.leave_household(uuid) to authenticated;
grant execute on function public.transfer_ownership(uuid, uuid) to authenticated;
grant execute on function public.archive_household(uuid) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
