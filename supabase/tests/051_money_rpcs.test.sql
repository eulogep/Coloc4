-- T-0008 — expense and settlement RPCs (design §4.6, §4.8, §4.13, §4.15, §9.4, §9.5).
begin;
\ir helpers/auth.psql
select plan(44);

select tests.create_user('a@test.local') as a \gset
select tests.create_user('b@test.local') as b \gset
select tests.create_user('c@test.local') as c \gset
select tests.create_user('d@test.local') as d \gset
select tests.create_user('x@test.local') as x \gset
select tests.create_household('H1') as h \gset
select tests.create_household('H2') as hx \gset
select tests.add_member(:'h', :'a', 'Alice', 'owner') as ma \gset
select tests.add_member(:'h', :'b', 'Bob') as mb \gset
select tests.add_member(:'h', :'c', 'Carl') as mc \gset
select tests.add_member(:'h', :'d', 'Dora') as md \gset
select tests.add_member(:'hx', :'x', 'Xavier', 'owner') as mx \gset

create function pg_temp.net(p_member uuid) returns bigint language sql as $f$
  select net_minor::bigint from public.member_balances where member_id = p_member $f$;

select tests.authenticate_as(:'a');

-- E2E-2 at database level: 80 € by Alice between 4 → 20 € each.
select public.create_expense(:'h', ' Courses   Lidl ', '8000', :'ma', 'equal', current_date,
  jsonb_build_array(:'ma', :'mb', :'mc', :'md')) as e1 \gset
select results_eq(format($$ select title, amount_minor, split_mode::text, created_by_member_id from public.expenses where id = %L $$, :'e1'),
  format($$ values ('Courses Lidl'::text, 8000::bigint, 'equal'::text, %L::uuid) $$, :'ma'),
  'expense stored with normalized title and actor from auth.uid()');
select is((select array_agg(share_amount_minor order by share_amount_minor) from public.expense_shares where expense_id = :'e1'),
  array[2000, 2000, 2000, 2000]::bigint[], 'four equal shares of 20 €');
select is(pg_temp.net(:'ma'), 6000::bigint, 'Alice is owed 60 €');
select is(pg_temp.net(:'mb'), -2000::bigint, 'Bob owes 20 €');
select is((select sum(net_minor::bigint) from public.member_balances where household_id = :'h'), 0::numeric,
  'Σ net = 0');
-- Deferred checks run at COMMIT as the calling role: force them now, still authenticated.
select lives_ok($$ set constraints all immediate $$, 'deferred share-sum check passes as the authenticated caller');
set constraints all deferred;
select ok((select summary ? 'amount_minor' and not summary ? 'title' from public.activity_logs
           where entity_id = :'e1' and action = 'expense.created'), 'activity has amount, no free text');

-- Remainder distribution matches the TS rule: 1000 / 3 in uuid order.
select public.create_expense(:'h', 'Pizza', '1000', :'mb', 'equal', current_date,
  jsonb_build_array(:'mc', :'ma', :'mb')) as e2 \gset
select is((select array_agg(s.share_amount_minor order by s.member_id) from public.expense_shares s where expense_id = :'e2'),
  array[334, 333, 333]::bigint[], 'remainder cent goes to the smallest member id');

-- Exact split, payer not participating.
select public.create_expense(:'h', 'Cadeau', '1500', :'mc', 'exact', current_date,
  jsonb_build_array(jsonb_build_object('memberId', :'ma', 'amountMinor', '1000'),
                    jsonb_build_object('memberId', :'mb', 'amountMinor', '500'),
                    jsonb_build_object('memberId', :'md', 'amountMinor', '0'))) as e3 \gset
select is((select count(*)::int from public.expense_shares where expense_id = :'e3'), 3, 'exact shares stored, zero included');
select is((select sum(net_minor::bigint) from public.member_balances where household_id = :'h'), 0::numeric, 'still Σ net = 0');

-- Validation errors.
select throws_ok(format($$ select public.create_expense(%L, 'X', '10.00', %L, 'equal', current_date, '["%s"]') $$, :'h', :'ma', :'ma'),
  '22023', 'INVALID_AMOUNT', 'decimal amount strings are rejected (minor units only)');
select throws_ok(format($$ select public.create_expense(%L, 'X', '0', %L, 'equal', current_date, '["%s"]') $$, :'h', :'ma', :'ma'),
  '22023', 'INVALID_AMOUNT', 'zero amount rejected');
select throws_ok(format($$ select public.create_expense(%L, 'X', '100000001', %L, 'equal', current_date, '["%s"]') $$, :'h', :'ma', :'ma'),
  '22023', 'INVALID_AMOUNT', 'amount over 1 000 000 € rejected');
select throws_ok(format($$ select public.create_expense(%L, '  ', '100', %L, 'equal', current_date, '["%s"]') $$, :'h', :'ma', :'ma'),
  '22023', 'INVALID_TITLE', 'blank title rejected');
select throws_ok(format($$ select public.create_expense(%L, 'X', '100', %L, 'equal', current_date, '[]') $$, :'h', :'ma'),
  '22023', 'INVALID_PARTICIPANTS', 'no participant rejected');
select throws_ok(format($$ select public.create_expense(%L, 'X', '100', %L, 'equal', current_date, '["%s","%s"]') $$, :'h', :'ma', :'ma', :'ma'),
  '22023', 'DUPLICATE_PARTICIPANT', 'duplicate participant rejected');
select throws_ok(format($$ select public.create_expense(%L, 'X', '100', %L, 'equal', current_date, '["%s"]') $$, :'h', :'ma', :'mx'),
  '22023', 'INVALID_PARTICIPANTS', 'participant from another household rejected');
select throws_ok(format($$ select public.create_expense(%L, 'X', '100', %L, 'equal', current_date, '["%s"]') $$, :'h', :'mx', :'ma'),
  '22023', 'INVALID_PAYER', 'payer from another household rejected');
select throws_ok(format($$ select public.create_expense(%L, 'X', '100', %L, 'exact', current_date,
                           '[{"memberId":"%s","amountMinor":"60"},{"memberId":"%s","amountMinor":"30"}]') $$, :'h', :'ma', :'ma', :'mb'),
  '22023', 'SUM_MISMATCH', 'exact shares must sum to the amount');
select throws_ok(format($$ select public.create_expense(%L, 'X', '100', %L, 'exact', current_date,
                           '[{"memberId":"%s","amountMinor":60}]') $$, :'h', :'ma', :'ma'),
  '22023', 'INVALID_PARTICIPANTS', 'exact share amounts must be strings (no JSON numbers)');
select throws_ok(format($$ select public.create_expense(%L, 'X', '100', %L, 'equal', date '1999-12-31', '["%s"]') $$, :'h', :'ma', :'ma'),
  '22023', 'INVALID_DATE', 'implausible date rejected');

-- Outsider and anon.
select tests.authenticate_as(:'x');
select throws_ok(format($$ select public.create_expense(%L, 'X', '100', %L, 'equal', current_date, '["%s"]') $$, :'h', :'ma', :'ma'),
  '42501', 'NOT_A_MEMBER', 'outsider cannot add an expense');
select is_empty(format($$ select 1 from public.expenses where household_id = %L $$, :'h'), 'outsider sees no expenses');
select is_empty(format($$ select 1 from public.member_balances where household_id = %L $$, :'h'), 'outsider sees no balances');
select throws_ok(format($$ select public.delete_expense(%L) $$, :'e1'), 'P0002', 'NOT_FOUND', 'outsider cannot delete');
select tests.authenticate_as(:'a');
select throws_ok(format($$ insert into public.expenses (household_id, title, amount_minor, paid_by_member_id, split_mode, spent_on, created_by_member_id)
                           values (%L, 'X', 100, %L, 'equal', current_date, %L) $$, :'h', :'ma', :'ma'),
  '42501', null, 'no direct insert into expenses');
select throws_ok(format($$ update public.expense_shares set share_amount_minor = 0 where expense_id = %L $$, :'e1'),
  '42501', null, 'no direct update of shares');

-- Former member: kept in balances, excluded from new expenses (§5.9), kept on edits (PC-9).
select tests.clear_authentication();
update public.household_members set status = 'left', left_at = now() where id = :'md';
select tests.authenticate_as(:'a');
select is(pg_temp.net(:'md'), -2000::bigint, 'former member keeps their balance');
select throws_ok(format($$ select public.create_expense(%L, 'X', '100', %L, 'equal', current_date, '["%s"]') $$, :'h', :'ma', :'md'),
  '22023', 'INVALID_PARTICIPANTS', 'former member cannot join a new expense');
select lives_ok(format($$ select public.update_expense(%L, 'Courses Lidl', '8400', %L, 'equal', current_date, '["%s","%s","%s","%s"]') $$,
                       :'e1', :'ma', :'ma', :'mb', :'mc', :'md'),
  'editing an old expense may keep a former member');
select is(pg_temp.net(:'md'), -2100::bigint, 'edit replaced the shares (84 € / 4)');
select is((select count(*)::int from public.expense_shares where expense_id = :'e1'), 4, 'no duplicate shares after edit');

-- Soft delete.
select lives_ok(format($$ select public.delete_expense(%L) $$, :'e2'), 'any active member can delete');
select lives_ok(format($$ select public.delete_expense(%L) $$, :'e2'), 'delete is idempotent');
select is((select count(*)::int from public.expense_shares where expense_id = :'e2'), 3, 'soft delete keeps the shares');
select is((select sum(net_minor::bigint) from public.member_balances where household_id = :'h'), 0::numeric, 'Σ net = 0 after delete');

-- Settlements: mandatory sign test at database level (§4.8 / T1).
select pg_temp.net(:'mb') as bob_before \gset
select pg_temp.net(:'ma') as alice_before \gset
select results_eq(format($$ select result_code from public.record_settlement(%L, %L, %L, '1000', current_date) $$, :'h', :'mb', :'ma'),
  $$ values ('RECORDED'::text) $$, 'Bob records paying Alice 10 €');
select is(pg_temp.net(:'mb'), :'bob_before'::bigint + 1000, 'sender net goes UP by the amount');
select is(pg_temp.net(:'ma'), :'alice_before'::bigint - 1000, 'receiver net goes DOWN by the amount');

select throws_ok(format($$ select * from public.record_settlement(%L, %L, %L, '100', current_date) $$, :'h', :'mb', :'mc'),
  '42501', 'ACTOR_NOT_INVOLVED', 'the recorder must be one of the two parties');

-- Former member settles their historical debt (§4.13); overshoot needs confirmation.
select results_eq(format($$ select result_code from public.record_settlement(%L, %L, %L, '2200', current_date) $$, :'h', :'md', :'ma'),
  $$ values ('CONFIRMATION_REQUIRED'::text) $$, 'paying more than a former member owes needs confirmation');
select results_eq(format($$ select result_code from public.record_settlement(%L, %L, %L, '2100', current_date) $$, :'h', :'md', :'ma'),
  $$ values ('RECORDED'::text) $$, 'former member settles exactly their debt');
select is(pg_temp.net(:'md'), 0::bigint, 'former member is settled');
select is((select sum(net_minor::bigint) from public.member_balances where household_id = :'h'), 0::numeric, 'Σ net = 0 after settlements');

select * from finish();
rollback;
