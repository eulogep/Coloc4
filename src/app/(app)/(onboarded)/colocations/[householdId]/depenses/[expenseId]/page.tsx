import Link from "next/link";
import { notFound } from "next/navigation";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/modules/expenses/dates";
import { DeleteExpenseButton } from "@/modules/expenses/delete-expense-button";
import { formatEur } from "@/modules/expenses/domain/money";
import { getExpense } from "@/modules/expenses/queries";
import { getHousehold } from "@/modules/households/queries";

export default async function ExpenseDetailPage({
  params,
}: PageProps<"/colocations/[householdId]/depenses/[expenseId]">) {
  const { householdId, expenseId } = await params;
  const household = await getHousehold(householdId);
  if (!household) notFound();
  const expense = await getExpense(household.id, expenseId);
  const base = `/colocations/${household.id}/depenses`;

  if (!expense || expense.deleted) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
        <p>{fr.expenses.notFound}</p>
        <Link href={base} className="font-medium underline">
          {fr.expenses.back}
        </Link>
      </main>
    );
  }

  const members = new Map(household.members.map((m) => [m.id, m]));
  const nameOf = (id: string) => {
    const m = members.get(id);
    if (!m) return "?";
    return m.status === "active" ? m.displayName : `${m.displayName} — ${fr.expenses.form.formerTag}`;
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <Link href={base} className="text-sm underline">
        {fr.expenses.back}
      </Link>
      <h1 className="text-2xl font-semibold">{expense.title}</h1>
      <p className="text-3xl font-semibold tabular-nums">{formatEur(expense.amountMinor)}</p>
      <p>
        {fr.expenses.paidBy(nameOf(expense.paidByMemberId))} · {formatDay(expense.spentOn)}
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">{fr.expenses.detailParticipants}</h2>
        <ul className="flex flex-col gap-1">
          {expense.shares
            .filter((s) => s.amountMinor > 0n)
            .map((s) => (
              <li key={s.memberId} className="flex justify-between rounded-lg border border-zinc-300 px-4 py-2">
                <span>{nameOf(s.memberId)}</span>
                <span className="tabular-nums">{formatEur(s.amountMinor)}</span>
              </li>
            ))}
        </ul>
      </section>

      <div className="flex flex-col gap-3">
        <Link
          href={`${base}/${expense.id}/modifier`}
          className="flex min-h-12 items-center justify-center rounded-full border border-zinc-400 px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {fr.expenses.edit}
        </Link>
        <DeleteExpenseButton householdId={household.id} expenseId={expense.id} />
      </div>
    </main>
  );
}
