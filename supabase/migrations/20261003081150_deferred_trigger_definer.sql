-- Fix (found by E2E in T-0009): the deferred share-sum trigger fires at COMMIT,
-- after the SECURITY DEFINER RPC has returned, i.e. as the calling role
-- (`authenticated`). That role cannot execute private.assert_expense_balanced
-- (nor read expenses bypassing RLS), so every real expense write failed.
-- The trigger functions now run with their owner's privileges.

alter function private.assert_expense_balanced(uuid) security definer;
alter function private.trg_expense_balanced() security definer;
