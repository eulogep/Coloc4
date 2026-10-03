-- T-0005 — invitation lifecycle and join results (design §7, §9.2, §9.3, §14.10).
begin;
\ir helpers/auth.psql
select plan(35);

select tests.create_user('owner@test.local') as o \gset
select tests.create_user('bob@test.local') as b \gset
select tests.create_user('carl@test.local') as c \gset
select tests.create_user('dora@test.local') as d \gset
select tests.create_user('noprofile@test.local') as np \gset
insert into public.profiles (user_id, display_name)
values (:'o', 'Olga'), (:'b', 'Bob'), (:'c', 'Carl'), (:'d', 'Dora');

select tests.authenticate_as(:'o');
select public.create_household('Coloc', 'Europe/Paris') as h \gset
select public.create_household('Autre coloc', 'Europe/Paris') as h_other \gset

-- create_invitation
select token as t1, invitation_id as i1 from public.create_invitation(:'h') \gset
select is(char_length(:'t1'), 43, 'token is 43 base64url chars (256 bits)');
select ok(:'t1' ~ '^[A-Za-z0-9_-]{43}$', 'token is URL-safe');
select tests.clear_authentication();
select results_eq(format($$ select max_uses, use_count, revoked_at is null,
                                  expires_at between now() + interval '7 days' - interval '1 minute'
                                                 and now() + interval '7 days' + interval '1 minute'
                           from public.household_invitations where id = %L $$, :'i1'),
  $$ values (10, 0, true, true) $$, 'defaults: 10 uses, 7 days, not revoked');
select is((select token_hash from public.household_invitations where id = :'i1'), sha256(convert_to(:'t1', 'UTF8')),
  'only the SHA-256 of the token is stored');
select is_empty(format($$ select 1 from public.household_invitations where encode(token_hash, 'escape') like '%%%s%%' $$, :'t1'),
  'raw token is not stored');

-- Members can list invitations but not read token_hash; outsiders see nothing.
select tests.authenticate_as(:'o');
select is((select count(*)::int from public.household_invitations where household_id = :'h'), 1, 'member lists invitations');
select throws_ok($$ select token_hash from public.household_invitations $$, '42501', null, 'token_hash is not readable');
select tests.authenticate_as(:'b');
select is_empty($$ select id from public.household_invitations $$, 'outsider sees no invitations');
select throws_ok(format($$ select * from public.create_invitation(%L) $$, :'h'), '42501', 'NOT_A_MEMBER',
  'outsider cannot create an invitation');

-- preview: name only when joinable
select results_eq(format($$ select result_code, household_name from public.preview_invitation(%L) $$, :'t1'),
  $$ values ('VALID'::text, 'Coloc'::text) $$, 'preview shows the household name for a valid link');
select results_eq($$ select result_code, household_name from public.preview_invitation('nope') $$,
  $$ values ('INVALID'::text, null::text) $$, 'preview of garbage is INVALID without name');

-- join: JOINED, consumes one use
select results_eq(format($$ select result_code, target_household_id from public.join_household(%L) $$, :'t1'),
  format($$ values ('JOINED'::text, %L::uuid) $$, :'h'), 'Bob joins');
select tests.clear_authentication();
select is((select use_count from public.household_invitations where id = :'i1'), 1, 'JOINED consumes one use');
select results_eq(format($$ select display_name_snapshot, role::text, status::text from public.household_members
                           where household_id = %L and user_id = %L $$, :'h', :'b'),
  $$ values ('Bob'::text, 'member'::text, 'active'::text) $$, 'Bob is an active member named from his profile');
select is((select count(*)::int from public.activity_logs where household_id = :'h' and action = 'member.joined'), 1,
  'join is logged');

-- ALREADY_MEMBER consumes nothing (§14.10), even on an expired link (PC-4).
select tests.authenticate_as(:'b');
select results_eq(format($$ select result_code from public.join_household(%L) $$, :'t1'),
  $$ values ('ALREADY_MEMBER'::text) $$, 'second join is ALREADY_MEMBER');
select tests.clear_authentication();
select is((select use_count from public.household_invitations where id = :'i1'), 1, 'ALREADY_MEMBER consumes nothing');
update public.household_invitations set expires_at = now() - interval '1 second' where id = :'i1';
select tests.authenticate_as(:'b');
select results_eq(format($$ select result_code from public.join_household(%L) $$, :'t1'),
  $$ values ('ALREADY_MEMBER'::text) $$, 'member opening an expired link still gets ALREADY_MEMBER');

-- EXPIRED
select tests.authenticate_as(:'c');
select results_eq(format($$ select result_code, target_household_id from public.join_household(%L) $$, :'t1'),
  $$ values ('EXPIRED'::text, null::uuid) $$, 'expired link');
select results_eq(format($$ select result_code, household_name from public.preview_invitation(%L) $$, :'t1'),
  $$ values ('EXPIRED'::text, null::text) $$, 'preview of an expired link hides the name');

-- REVOKED (and revoke is member-only, idempotent)
select tests.authenticate_as(:'o');
select token as t2, invitation_id as i2 from public.create_invitation(:'h') \gset
select tests.authenticate_as(:'d');
select throws_ok(format($$ select public.revoke_invitation(%L) $$, :'i2'), 'P0002', 'NOT_FOUND',
  'outsider cannot revoke');
select tests.authenticate_as(:'b');
select lives_ok(format($$ select public.revoke_invitation(%L) $$, :'i2'), 'any active member can revoke');
select lives_ok(format($$ select public.revoke_invitation(%L) $$, :'i2'), 'revoke is idempotent');
select tests.authenticate_as(:'c');
select results_eq(format($$ select result_code from public.join_household(%L) $$, :'t2'),
  $$ values ('REVOKED'::text) $$, 'revoked link');

-- EXHAUSTED
select tests.authenticate_as(:'o');
select token as t3, invitation_id as i3 from public.create_invitation(:'h') \gset
select tests.clear_authentication();
update public.household_invitations set max_uses = 1 where id = :'i3';
select tests.authenticate_as(:'c');
select results_eq(format($$ select result_code from public.join_household(%L) $$, :'t3'),
  $$ values ('JOINED'::text) $$, 'Carl uses the last use');
select tests.authenticate_as(:'d');
select results_eq(format($$ select result_code from public.join_household(%L) $$, :'t3'),
  $$ values ('EXHAUSTED'::text) $$, 'no use left');
select tests.clear_authentication();
select is((select use_count from public.household_invitations where id = :'i3'), 1, 'use_count never exceeds max_uses');

-- REACTIVATED: same membership row (§5.8)
select id as carl_member from public.household_members where household_id = :'h' and user_id = :'c' \gset
update public.household_members set status = 'left', left_at = now() where id = :'carl_member';
select tests.authenticate_as(:'o');
select token as t4 from public.create_invitation(:'h') \gset
select tests.authenticate_as(:'c');
select results_eq(format($$ select result_code from public.join_household(%L) $$, :'t4'),
  $$ values ('REACTIVATED'::text) $$, 'former member rejoins');
select tests.clear_authentication();
select results_eq(format($$ select id, status::text, left_at from public.household_members
                           where household_id = %L and user_id = %L $$, :'h', :'c'),
  format($$ values (%L::uuid, 'active'::text, null::timestamptz) $$, :'carl_member'),
  'the same membership row is reactivated');

-- Anonymized identity is never reactivated: a new identity is created.
insert into public.household_members (household_id, user_id, display_name_snapshot, status, anonymized_at)
values (:'h', null, 'Ancien colocataire 1', 'anonymized', now());
select tests.authenticate_as(:'d');
select results_eq(format($$ select result_code from public.join_household(%L) $$, :'t4'),
  $$ values ('JOINED'::text) $$, 'a new account joins next to an anonymized member');
select tests.clear_authentication();
select is((select count(*)::int from public.household_members where household_id = :'h' and status = 'anonymized'), 1,
  'the anonymized identity is untouched');

-- Archived household → INVALID
select tests.authenticate_as(:'o');
select token as t5 from public.create_invitation(:'h_other') \gset
select tests.clear_authentication();
update public.households set archived_at = now() where id = :'h_other';
select tests.authenticate_as(:'b');
select results_eq(format($$ select result_code from public.join_household(%L) $$, :'t5'),
  $$ values ('INVALID'::text) $$, 'archived household link is INVALID');

-- Profile required before joining
select tests.authenticate_as(:'o');
select token as t6 from public.create_invitation(:'h') \gset
select tests.authenticate_as(:'np');
select throws_ok(format($$ select * from public.join_household(%L) $$, :'t6'), 'P0001', 'PROFILE_REQUIRED',
  'a profile is required to join');

-- Anonymous callers
select tests.authenticate_as_anon();
select throws_ok(format($$ select * from public.join_household(%L) $$, :'t6'), '42501', null, 'anon cannot join');

-- Rate limit: 20 lookups / 10 min / user
select tests.authenticate_as(:'d');
select is((select count(*)::int from generate_series(1, 25) g, lateral public.join_household(left('x' || g, 1)) j
           where j.result_code = 'RATE_LIMITED'), 25 - (20 - 2),
  'lookups beyond 20 per 10 minutes are RATE_LIMITED');

select * from finish();
rollback;
