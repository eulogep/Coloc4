import { notFound } from "next/navigation";
import { fr } from "@/i18n/fr";
import { getHouseholdBalances } from "@/modules/expenses/balances-query";
import { explainBalance } from "@/modules/expenses/domain/balances";
import { formatEur } from "@/modules/expenses/domain/money";
import { recommendSettlements } from "@/modules/expenses/domain/settlements";
import { formatDay } from "@/modules/expenses/dates";
import { getHousehold } from "@/modules/households/queries";

function signed(amount: bigint): string {
  return amount > 0n ? `+${formatEur(amount)}` : formatEur(amount);
}

export default async function BalancesPage({ params }: PageProps<"/colocations/[householdId]/soldes">) {
  const { householdId } = await params;
  const household = await getHousehold(householdId);
  if (!household) notFound();

  const result = await getHouseholdBalances(
    household.id,
    household.members.map((m) => m.id),
  );
  if (!result.ok) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
        <h1 className="text-2xl font-semibold">{fr.balances.title}</h1>
        <p role="alert">{fr.balances.integrityError}</p>
      </main>
    );
  }

  const { balances, ledger } = result;
  const members = new Map(household.members.map((m) => [m.id, m]));
  const name = (id: string) => {
    const m = members.get(id);
    if (!m) return "?";
    return m.status === "active" ? m.displayName : `${m.displayName} (${fr.balances.former})`;
  };
  const me = household.myMemberId;
  const myNet = balances.find((b) => b.memberId === me)?.netMinor ?? 0n;
  const recommendations = recommendSettlements(balances);
  const lines = explainBalance(me, ledger.expenses, ledger.settlements);
  const expenseById = new Map(ledger.expenses.map((e) => [e.id, e]));
  const settlementById = new Map(ledger.settlements.map((s) => [s.id, s]));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold">{fr.balances.title}</h1>

      <section aria-labelledby="my-balance" className="flex flex-col gap-2 rounded-lg border border-zinc-400 p-4">
        <h2 id="my-balance" className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {fr.balances.yourBalance}
        </h2>
        <p className="text-2xl font-semibold">
          {myNet > 0n
            ? fr.balances.owedToYou(formatEur(myNet))
            : myNet < 0n
              ? fr.balances.youOwe(formatEur(-myNet))
              : fr.balances.settled}
        </p>
        <details>
          <summary className="cursor-pointer py-2 font-medium underline">{fr.balances.why}</summary>
          {lines.length === 0 ? (
            <p className="text-sm">{fr.balances.whyEmpty}</p>
          ) : (
            <ul className="flex flex-col gap-2 pt-2 text-sm">
              {lines.map((line) => {
                if (line.kind === "expense") {
                  const e = expenseById.get(line.id);
                  const parts = [
                    line.paidMinor > 0n ? fr.balances.linePaid(formatEur(line.paidMinor)) : null,
                    line.shareMinor > 0n ? fr.balances.lineShare(formatEur(line.shareMinor)) : null,
                  ].filter(Boolean);
                  return (
                    <li key={`e-${line.id}`} className="flex justify-between gap-2">
                      <span>
                        <span className="font-medium">{e?.title}</span>
                        {e && <span className="text-zinc-600 dark:text-zinc-400"> · {formatDay(e.spentOn)}</span>}
                        <br />
                        {parts.join(", ")}
                      </span>
                      <span className="tabular-nums">{signed(line.deltaMinor)}</span>
                    </li>
                  );
                }
                const s = settlementById.get(line.id);
                return (
                  <li key={`s-${line.id}`} className="flex justify-between gap-2">
                    <span>
                      {line.kind === "settlement_sent"
                        ? fr.balances.lineSent(name(s?.to ?? ""))
                        : fr.balances.lineReceived(name(s?.from ?? ""))}
                      {s && <span className="text-zinc-600 dark:text-zinc-400"> · {formatDay(s.settledOn)}</span>}
                    </span>
                    <span className="tabular-nums">{signed(line.deltaMinor)}</span>
                  </li>
                );
              })}
              <li className="flex justify-between gap-2 border-t border-zinc-300 pt-2 font-semibold">
                <span>{fr.balances.total}</span>
                <span className="tabular-nums">{signed(myNet)}</span>
              </li>
            </ul>
          )}
        </details>
      </section>

      <section aria-labelledby="recommendations" className="flex flex-col gap-2">
        <h2 id="recommendations" className="text-lg font-medium">
          {fr.balances.recommendationsTitle}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{fr.balances.recommendationsHint}</p>
        {recommendations.length === 0 ? (
          <p>{fr.balances.noRecommendation}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recommendations.map((r) => (
              <li key={`${r.fromMemberId}-${r.toMemberId}`} className="rounded-lg border border-zinc-300 px-4 py-3">
                {r.fromMemberId === me
                  ? fr.balances.youPay(formatEur(r.amountMinor), name(r.toMemberId))
                  : r.toMemberId === me
                    ? fr.balances.paysYou(name(r.fromMemberId), formatEur(r.amountMinor))
                    : fr.balances.pays(name(r.fromMemberId), formatEur(r.amountMinor), name(r.toMemberId))}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="everyone" className="flex flex-col gap-2">
        <h2 id="everyone" className="text-lg font-medium">
          {fr.balances.everyoneTitle}
        </h2>
        <ul className="flex flex-col gap-1">
          {balances
            .filter((b) => members.get(b.memberId)?.status === "active" || b.netMinor !== 0n)
            .map((b) => (
              <li key={b.memberId} className="flex justify-between gap-2 rounded-lg border border-zinc-300 px-4 py-2">
                <span>{name(b.memberId)}</span>
                <span>
                  {b.netMinor > 0n
                    ? fr.balances.memberOwed(formatEur(b.netMinor))
                    : b.netMinor < 0n
                      ? fr.balances.memberOwes(formatEur(-b.netMinor))
                      : fr.balances.memberSettled}
                </span>
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
