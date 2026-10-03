import Link from "next/link";
import { notFound } from "next/navigation";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/modules/expenses/dates";
import { formatEur } from "@/modules/expenses/domain/money";
import { listExpenses } from "@/modules/expenses/queries";
import { getHousehold } from "@/modules/households/queries";

export default async function ExpensesPage({ params }: PageProps<"/colocations/[householdId]/depenses">) {
  const { householdId } = await params;
  const household = await getHousehold(householdId);
  if (!household) notFound();
  const expenses = await listExpenses(household.id);
  const names = new Map(household.members.map((m) => [m.id, m.displayName]));
  const base = `/colocations/${household.id}/depenses`;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold">{fr.expenses.title}</h1>
      <Link
        href={`${base}/nouvelle`}
        className="flex min-h-12 items-center justify-center rounded-full bg-foreground px-6 font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {fr.expenses.add}
      </Link>

      {expenses.length === 0 ? (
        <section className="flex flex-col gap-1 py-6 text-center">
          <p className="font-medium">{fr.expenses.emptyTitle}</p>
          <p>{fr.expenses.emptyHint}</p>
        </section>
      ) : (
        <ul className="flex flex-col gap-2">
          {expenses.map((e) => {
            const myShare = e.shares.find((s) => s.memberId === household.myMemberId)?.amountMinor ?? 0n;
            return (
              <li key={e.id}>
                <Link
                  href={`${base}/${e.id}`}
                  className="flex flex-col gap-1 rounded-lg border border-zinc-300 px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{e.title}</span>
                    <span className="font-semibold tabular-nums">{formatEur(e.amountMinor)}</span>
                  </span>
                  <span className="flex justify-between gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <span>{fr.expenses.paidBy(names.get(e.paidByMemberId) ?? "?")}</span>
                    <span>{formatDay(e.spentOn)}</span>
                  </span>
                  <span className="text-sm">
                    {myShare > 0n ? fr.expenses.yourShare(formatEur(myShare)) : fr.expenses.notConcerned}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
