import Link from "next/link";
import { notFound } from "next/navigation";
import { fr } from "@/i18n/fr";
import { toInputString } from "@/modules/expenses/domain/money";
import { ExpenseForm } from "@/modules/expenses/expense-form";
import { getExpense } from "@/modules/expenses/queries";
import { getHousehold } from "@/modules/households/queries";

export default async function EditExpensePage({
  params,
}: PageProps<"/colocations/[householdId]/depenses/[expenseId]/modifier">) {
  const { householdId, expenseId } = await params;
  const household = await getHousehold(householdId);
  if (!household) notFound();
  const expense = await getExpense(household.id, expenseId);
  if (!expense || expense.deleted) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
        <p>{fr.expenses.notFound}</p>
        <Link href={`/colocations/${household.id}/depenses`} className="font-medium underline">
          {fr.expenses.back}
        </Link>
      </main>
    );
  }

  // Former members already on this expense stay selectable (PC-9); others are active only.
  const involved = new Set([expense.paidByMemberId, ...expense.shares.map((s) => s.memberId)]);
  const members = household.members
    .filter((m) => m.status === "active" || involved.has(m.id))
    .map((m) => ({ id: m.id, displayName: m.displayName, active: m.status === "active" }));
  const participants = expense.shares.filter((s) => s.amountMinor > 0n).map((s) => s.memberId);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold">{fr.expenses.editTitle}</h1>
      <ExpenseForm
        householdId={household.id}
        expenseId={expense.id}
        myMemberId={household.myMemberId}
        members={members}
        defaults={{
          title: expense.title,
          amount: toInputString(expense.amountMinor),
          paidBy: expense.paidByMemberId,
          spentOn: expense.spentOn,
          splitMode: expense.splitMode,
          participants: expense.splitMode === "equal" ? expense.shares.map((s) => s.memberId) : participants,
          exactShares: Object.fromEntries(expense.shares.map((s) => [s.memberId, toInputString(s.amountMinor)])),
        }}
      />
    </main>
  );
}
