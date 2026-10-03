-- T-0008 — database-level money invariants (design §9.2–§9.6, §14.6, §14.7).
begin;
\ir helpers/auth.psql
select plan(15);

select tests.create_user('a@test.local') as a \gset
select tests.create_user('b@test.local') as b \gset
select tests.create_household('H1') as h1 \gset
select tests.create_household('H2') as h2 \gset
select tests.add_member(:'h1', :'a', 'Alice', 'owner') as ma \gset
select tests.add_member(:'h2', :'b', 'Bruno', 'owner') as mb \gset

-- Cross-household references are rejected by composite foreign keys (§14.6).
select throws_ok(format($$ insert into public.expenses (household_id, title, amount_minor, paid_by_member_id, split_mode, spent_on, created_by_member_id)
                           values (%L, 'X', 100, %L, 'equal', current_date, %L) $$, :'h1', :'mb', :'ma'),
  '23503', null, 'expense payer from another household is rejected');
select throws_ok(format($$ insert into public.settlements (household_id, from_member_id, to_member_id, amount_minor, settled_on, created_by_member_id)
                           values (%L, %L, %L, 100, current_date, %L) $$, :'h1', :'ma', :'mb', :'ma'),
  '23503', null, 'settlement counterpart from another household is rejected');

insert into public.expenses (id, household_id, title, amount_minor, paid_by_member_id, split_mode, spent_on, created_by_member_id)
values ('00000000-0000-4000-8000-0000000000e1', :'h1', 'Courses', 1000, :'ma', 'exact', current_date, :'ma');
select throws_ok(format($$ insert into public.expense_shares (expense_id, household_id, member_id, share_amount_minor)
                           values ('00000000-0000-4000-8000-0000000000e1', %L, %L, 1000) $$, :'h1', :'mb'),
  '23503', null, 'share for a member of another household is rejected');
select throws_ok(format($$ insert into public.expense_shares (expense_id, household_id, member_id, share_amount_minor)
                           values ('00000000-0000-4000-8000-0000000000e1', %L, %L, 1000) $$, :'h2', :'mb'),
  '23503', null, 'share pointing to an expense of another household is rejected');

-- SUM(shares) = amount is checked at commit (deferred constraint trigger).
select throws_ok($$ set constraints all immediate $$, '23514', null,
  'an expense without shares cannot be committed');
insert into public.expense_shares (expense_id, household_id, member_id, share_amount_minor)
values ('00000000-0000-4000-8000-0000000000e1', :'h1', :'ma', 999);
select throws_ok($$ set constraints all immediate $$, '23514', null, 'shares summing to 999 for 1000 are rejected');
update public.expense_shares set share_amount_minor = 1000 where expense_id = '00000000-0000-4000-8000-0000000000e1';
select lives_ok($$ set constraints all immediate $$, 'balanced shares are accepted');
set constraints all deferred;

update public.expense_shares set share_amount_minor = 0 where expense_id = '00000000-0000-4000-8000-0000000000e1';
update public.expenses set amount_minor = 0 + 1 where id = '00000000-0000-4000-8000-0000000000e1';
select throws_ok($$ set constraints all immediate $$, '23514', null, 'all-zero shares are rejected');
set constraints all deferred;
update public.expense_shares set share_amount_minor = 1 where expense_id = '00000000-0000-4000-8000-0000000000e1';
select lives_ok($$ set constraints all immediate $$, 'consistent again');
set constraints all deferred;

-- Column checks.
select throws_ok(format($$ insert into public.settlements (household_id, from_member_id, to_member_id, amount_minor, settled_on, created_by_member_id)
                           values (%L, %L, %L, 100, current_date, %L) $$, :'h1', :'ma', :'ma', :'ma'),
  '23514', null, 'self-settlement is rejected');
select throws_ok(format($$ insert into public.settlements (household_id, from_member_id, to_member_id, amount_minor, settled_on, created_by_member_id)
                           values (%L, %L, %L, 0, current_date, %L) $$, :'h1', :'ma', :'ma', :'ma'),
  '23514', null, 'zero settlement is rejected');
select throws_ok(format($$ insert into public.expense_shares (expense_id, household_id, member_id, share_amount_minor)
                           values ('00000000-0000-4000-8000-0000000000e1', %L, %L, -1) $$, :'h1', :'ma'),
  '23514', null, 'negative share is rejected');

-- Currency becomes immutable once money history exists — even soft-deleted (§14.7, PC-3).
update public.expenses set deleted_at = now(), deleted_by_member_id = :'ma' where id = '00000000-0000-4000-8000-0000000000e1';
select throws_ok(format($$ update public.households set currency = 'USD' where id = %L $$, :'h1'),
  '23514', 'CURRENCY_IMMUTABLE', 'currency cannot change after the first expense, even deleted');
select throws_ok(format($$ update public.households set currency = 'USD' where id = %L $$, :'h2'),
  '23514', null, 'M1: a household without history is still EUR only');
select is((select currency::text from public.households where id = :'h1'), 'EUR', 'currency unchanged');

select * from finish();
rollback;
