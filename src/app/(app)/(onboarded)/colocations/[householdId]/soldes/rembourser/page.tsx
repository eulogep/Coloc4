import { notFound } from "next/navigation";
import { fr } from "@/i18n/fr";
import { isUuid } from "@/lib/uuid";
import { getHouseholdBalances } from "@/modules/expenses/balances-query";
import { todayIn } from "@/modules/expenses/dates";
import { minorFromWire, toInputString } from "@/modules/expenses/domain/money";
import { getHousehold } from "@/modules/households/queries";
import { SettlementForm } from "@/modules/settlements/settlement-form";

function prefillAmount(raw: unknown): string {
  if (typeof raw !== "string" || !/^[1-9]\d{0,8}$/.test(raw)) return "";
  return toInputString(minorFromWire(raw));
}

export default async function RecordSettlementPage({
  params,
  searchParams,
}: PageProps<"/colocations/[householdId]/soldes/rembourser">) {
  const [{ householdId }, query] = await Promise.all([params, searchParams]);
  const household = await getHousehold(householdId);
  if (!household) notFound();

  const result = await getHouseholdBalances(household.id, household.members.map((m) => m.id));
  if (!result.ok) {
    return (
      <main className="flex w-full flex-1 flex-col gap-5 px-4 pt-6 pb-8">
        <p role="alert">{fr.balances.integrityError}</p>
      </main>
    );
  }
  const net = new Map(result.balances.map((b) => [b.memberId, b.netMinor]));

  // Active roommates, plus former ones who still have a balance to settle (§4.13).
  const counterparts = household.members
    .filter((m) => m.id !== household.myMemberId)
    .filter((m) => m.status === "active" || (net.get(m.id) ?? 0n) !== 0n)
    .map((m) => ({
      id: m.id,
      label: m.status === "active" ? m.displayName : `${m.displayName} — ${fr.balances.former}`,
    }));

  const other = typeof query.avec === "string" && isUuid(query.avec) ? query.avec : "";

  return (
    <main className="flex w-full flex-1 flex-col gap-5 px-4 pt-6 pb-8">
      <h1 className="text-3xl font-extrabold tracking-tight">{fr.settlements.title}</h1>
      <p className="text-muted">{fr.settlements.intro}</p>
      <SettlementForm
        householdId={household.id}
        myMemberId={household.myMemberId}
        counterparts={counterparts}
        defaults={{
          direction: query.sens === "recu" ? "received" : "sent",
          other: counterparts.some((c) => c.id === other) ? other : "",
          amount: prefillAmount(query.montant),
          settledOn: todayIn(household.timezone),
        }}
      />
    </main>
  );
}
