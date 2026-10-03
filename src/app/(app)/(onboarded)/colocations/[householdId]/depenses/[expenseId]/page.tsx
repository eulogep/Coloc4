import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { fr } from "@/i18n/fr";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Page, SectionTitle } from "@/components/ui/page";
import { formatDay } from "@/modules/expenses/dates";
import { DeleteExpenseButton } from "@/modules/expenses/delete-expense-button";
import { formatEur } from "@/modules/expenses/domain/money";
import { getExpense } from "@/modules/expenses/queries";
import { getHousehold } from "@/modules/households/queries";

function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-1 self-start rounded-full py-2 font-bold text-muted hover:text-ink">
      <ArrowLeft aria-hidden="true" className="size-5" />
      {fr.expenses.back}
    </Link>
  );
}

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
      <Page>
        <BackLink href={base} />
        <p>{fr.expenses.notFound}</p>
      </Page>
    );
  }

  const members = new Map(household.members.map((m) => [m.id, m]));
  const nameOf = (id: string) => {
    const m = members.get(id);
    if (!m) return "?";
    return m.status === "active" ? m.displayName : `${m.displayName} — ${fr.expenses.form.formerTag}`;
  };
  const payer = members.get(expense.paidByMemberId);

  return (
    <Page>
      <BackLink href={base} />
      <Card className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-extrabold">{expense.title}</h1>
        <p className="tabular text-4xl font-black text-brand">{formatEur(expense.amountMinor)}</p>
        <p className="flex items-center gap-2 text-muted">
          <Avatar id={expense.paidByMemberId} name={payer?.displayName ?? "?"} size="sm" muted={payer?.status !== "active"} />
          <span>
            {fr.expenses.paidBy(nameOf(expense.paidByMemberId))} · {formatDay(expense.spentOn)}
          </span>
        </p>
      </Card>

      <section className="flex flex-col gap-3">
        <SectionTitle>{fr.expenses.detailParticipants}</SectionTitle>
        <ul className="flex flex-col divide-y divide-line rounded-3xl border border-line bg-surface">
          {expense.shares
            .filter((s) => s.amountMinor > 0n)
            .map((s) => {
              const m = members.get(s.memberId);
              return (
                <li key={s.memberId} className="flex items-center gap-3 px-4 py-3">
                  <Avatar id={s.memberId} name={m?.displayName ?? "?"} size="sm" muted={m?.status !== "active"} />
                  <span className="flex-1">{nameOf(s.memberId)}</span>
                  <span className="tabular font-extrabold">{formatEur(s.amountMinor)}</span>
                </li>
              );
            })}
        </ul>
      </section>

      <div className="flex flex-col gap-3">
        <Link href={`${base}/${expense.id}/modifier`} className={buttonClass("secondary")}>
          <Pencil aria-hidden="true" className="size-4" />
          {fr.expenses.edit}
        </Link>
        <DeleteExpenseButton householdId={household.id} expenseId={expense.id} />
      </div>
    </Page>
  );
}
