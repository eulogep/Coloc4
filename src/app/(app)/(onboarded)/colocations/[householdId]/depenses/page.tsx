import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ChevronRight, Plus, ReceiptText } from "lucide-react";
import { fr } from "@/i18n/fr";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Page, PageTitle } from "@/components/ui/page";
import { formatDay } from "@/modules/expenses/dates";
import { formatEur } from "@/modules/expenses/domain/money";
import { listExpenses } from "@/modules/expenses/queries";
import { getHousehold } from "@/modules/households/queries";

export default async function ExpensesPage({ params }: PageProps<"/colocations/[householdId]/depenses">) {
  const { householdId } = await params;
  const household = await getHousehold(householdId);
  if (!household) notFound();
  const expenses = await listExpenses(household.id);
  const members = new Map(household.members.map((m) => [m.id, m]));
  const base = `/colocations/${household.id}/depenses`;

  return (
    <Page>
      <PageTitle>{fr.expenses.title}</PageTitle>
      <Link href={`${base}/nouvelle`} className={buttonClass("primary", "w-full")}>
        <Plus aria-hidden="true" className="size-5" strokeWidth={3} />
        {fr.expenses.add}
      </Link>

      {expenses.length === 0 ? (
        <>
          <EmptyState
            icon={<ReceiptText className="size-8" />}
            title={fr.expenses.emptyTitle}
            hint={fr.expenses.emptyHint}
          />
          <Link href="/guide" className={buttonClass("ghost", "self-center")}>
            <BookOpen aria-hidden="true" className="size-5" />
            {fr.guide.linkHome}
          </Link>
        </>
      ) : (
        <ul className="flex flex-col gap-3">
          {expenses.map((e) => {
            const payer = members.get(e.paidByMemberId);
            const myShare = e.shares.find((s) => s.memberId === household.myMemberId)?.amountMinor ?? 0n;
            return (
              <li key={e.id}>
                <Link
                  href={`${base}/${e.id}`}
                  className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <Avatar id={e.paidByMemberId} name={payer?.displayName ?? "?"} muted={payer?.status !== "active"} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-extrabold">{e.title}</span>
                      <span className="tabular shrink-0 text-lg font-extrabold">{formatEur(e.amountMinor)}</span>
                    </span>
                    <span className="text-sm text-muted">
                      {fr.expenses.paidBy(payer?.displayName ?? "?")} · {formatDay(e.spentOn)}
                    </span>
                    <span
                      className={`mt-1 self-start rounded-full px-2.5 py-0.5 text-sm font-bold ${
                        myShare > 0n ? "bg-brand-tint text-brand-strong" : "bg-neutral-tint text-muted"
                      }`}
                    >
                      {myShare > 0n ? fr.expenses.yourShare(formatEur(myShare)) : fr.expenses.notConcerned}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
