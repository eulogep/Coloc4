import { notFound } from "next/navigation";
import { fr } from "@/i18n/fr";
import { todayIn } from "@/modules/expenses/dates";
import { ExpenseForm } from "@/modules/expenses/expense-form";
import { getHousehold } from "@/modules/households/queries";

export default async function NewExpensePage({ params }: PageProps<"/colocations/[householdId]/depenses/nouvelle">) {
  const { householdId } = await params;
  const household = await getHousehold(householdId);
  if (!household) notFound();
  const active = household.members.filter((m) => m.status === "active");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold">{fr.expenses.newTitle}</h1>
      <ExpenseForm
        householdId={household.id}
        expenseId={null}
        myMemberId={household.myMemberId}
        members={active.map((m) => ({ id: m.id, displayName: m.displayName, active: true }))}
        defaults={{
          // Defaults (§13.4): payer = me, everyone, equal split, today in the household zone.
          title: "",
          amount: "",
          paidBy: household.myMemberId,
          spentOn: todayIn(household.timezone),
          splitMode: "equal",
          participants: active.map((m) => m.id),
          exactShares: {},
        }}
      />
    </main>
  );
}
