import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, ChevronDown, CircleCheck, HandCoins } from "lucide-react";
import { fr } from "@/i18n/fr";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { Page, PageTitle, SectionTitle } from "@/components/ui/page";
import { getHouseholdBalances } from "@/modules/expenses/balances-query";
import { explainBalance } from "@/modules/expenses/domain/balances";
import { formatEur } from "@/modules/expenses/domain/money";
import { recommendSettlements } from "@/modules/expenses/domain/settlements";
import { formatDay } from "@/modules/expenses/dates";
import { getHousehold } from "@/modules/households/queries";
import { SettlementHistory } from "@/modules/settlements/settlement-history";

function signed(amount: bigint): string {
  return amount > 0n ? `+${formatEur(amount)}` : formatEur(amount);
}

// The balance card: tint + icon + sentence (never colour alone).
const STATES = {
  owed: { card: "bg-positive-tint", accent: "text-positive", Icon: ArrowDownLeft },
  owes: { card: "bg-negative-tint", accent: "text-negative", Icon: ArrowUpRight },
  settled: { card: "bg-neutral-tint", accent: "text-ink", Icon: CircleCheck },
} as const;

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
      <Page>
        <PageTitle>{fr.balances.title}</PageTitle>
        <p role="alert" className="rounded-2xl bg-danger-tint px-4 py-3 font-semibold text-danger">
          {fr.balances.integrityError}
        </p>
      </Page>
    );
  }

  const { balances, ledger } = result;
  const members = new Map(household.members.map((m) => [m.id, m]));
  const name = (id: string) => {
    const m = members.get(id);
    if (!m) return "?";
    return m.status === "active" ? m.displayName : `${m.displayName} (${fr.balances.former})`;
  };
  const avatar = (id: string, size: "sm" | "md" = "sm") => {
    const m = members.get(id);
    return <Avatar id={id} name={m?.displayName ?? "?"} size={size} muted={m?.status !== "active"} />;
  };
  const me = household.myMemberId;
  const myNet = balances.find((b) => b.memberId === me)?.netMinor ?? 0n;
  const state = STATES[myNet > 0n ? "owed" : myNet < 0n ? "owes" : "settled"];
  const recommendations = recommendSettlements(balances);
  const lines = explainBalance(me, ledger.expenses, ledger.settlements);
  const expenseById = new Map(ledger.expenses.map((e) => [e.id, e]));
  const settlementById = new Map(ledger.settlements.map((s) => [s.id, s]));
  const settleHref = `/colocations/${household.id}/soldes/rembourser`;
  const history = ledger.settlements.slice(0, 20).map((s) => ({
    id: s.id,
    text: fr.settlements.historyLine(name(s.from), name(s.to), formatEur(s.amountMinor)),
    date: formatDay(s.settledOn),
  }));

  return (
    <Page>
      <PageTitle>{fr.balances.title}</PageTitle>

      <section aria-labelledby="my-balance" className={`flex flex-col gap-3 rounded-3xl p-5 ${state.card}`}>
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface ${state.accent}`}>
            <state.Icon className="size-7" strokeWidth={2.5} />
          </span>
          <div className="flex flex-col">
            <h2 id="my-balance" className="text-sm font-bold uppercase tracking-wide text-muted">
              {fr.balances.yourBalance}
            </h2>
            <p className={`text-3xl font-black leading-tight ${state.accent}`}>
              {myNet > 0n
                ? fr.balances.owedToYou(formatEur(myNet))
                : myNet < 0n
                  ? fr.balances.youOwe(formatEur(-myNet))
                  : fr.balances.settled}
            </p>
          </div>
        </div>
        <details className="group rounded-2xl bg-surface px-4">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-bold">
            {fr.balances.why}
            <ChevronDown aria-hidden="true" className="size-5 transition-transform group-open:rotate-180" />
          </summary>
          {lines.length === 0 ? (
            <p className="pb-4 text-sm text-muted">{fr.balances.whyEmpty}</p>
          ) : (
            <ul className="flex flex-col gap-3 pb-4 text-sm">
              {lines.map((line) => {
                if (line.kind === "expense") {
                  const e = expenseById.get(line.id);
                  const parts = [
                    line.paidMinor > 0n ? fr.balances.linePaid(formatEur(line.paidMinor)) : null,
                    line.shareMinor > 0n ? fr.balances.lineShare(formatEur(line.shareMinor)) : null,
                  ].filter(Boolean);
                  return (
                    <li key={`e-${line.id}`} className="flex justify-between gap-3">
                      <span>
                        <span className="font-bold">{e?.title}</span>
                        {e && <span className="text-muted"> · {formatDay(e.spentOn)}</span>}
                        <br />
                        <span className="text-muted">{parts.join(", ")}</span>
                      </span>
                      <span className="tabular shrink-0 font-bold">{signed(line.deltaMinor)}</span>
                    </li>
                  );
                }
                const s = settlementById.get(line.id);
                return (
                  <li key={`s-${line.id}`} className="flex justify-between gap-3">
                    <span>
                      {line.kind === "settlement_sent"
                        ? fr.balances.lineSent(name(s?.to ?? ""))
                        : fr.balances.lineReceived(name(s?.from ?? ""))}
                      {s && <span className="text-muted"> · {formatDay(s.settledOn)}</span>}
                    </span>
                    <span className="tabular shrink-0 font-bold">{signed(line.deltaMinor)}</span>
                  </li>
                );
              })}
              <li className="flex justify-between gap-3 border-t border-line pt-3 font-extrabold">
                <span>{fr.balances.total}</span>
                <span className="tabular">{signed(myNet)}</span>
              </li>
            </ul>
          )}
        </details>
      </section>

      <section aria-labelledby="recommendations" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <SectionTitle id="recommendations">{fr.balances.recommendationsTitle}</SectionTitle>
          <p className="text-sm text-muted">{fr.balances.recommendationsHint}</p>
        </div>
        {recommendations.length === 0 ? (
          <p className="flex items-center gap-2 rounded-2xl bg-positive-tint px-4 py-3 font-bold">
            <CircleCheck aria-hidden="true" className="size-5 text-positive" />
            {fr.balances.noRecommendation}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recommendations.map((r) => {
              const involvesMe = r.fromMemberId === me || r.toMemberId === me;
              const prefill = new URLSearchParams({
                avec: r.fromMemberId === me ? r.toMemberId : r.fromMemberId,
                sens: r.fromMemberId === me ? "envoye" : "recu",
                montant: r.amountMinor.toString(),
              });
              return (
                <li
                  key={`${r.fromMemberId}-${r.toMemberId}`}
                  className={`flex flex-col gap-3 rounded-3xl border bg-surface p-4 shadow-sm ${
                    involvesMe ? "border-brand" : "border-line"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="flex items-center gap-1">
                      {avatar(r.fromMemberId)}
                      <ArrowRight className="size-4 text-muted" />
                      {avatar(r.toMemberId)}
                    </span>
                    <span className="font-bold">
                      {r.fromMemberId === me
                        ? fr.balances.youPay(formatEur(r.amountMinor), name(r.toMemberId))
                        : r.toMemberId === me
                          ? fr.balances.paysYou(name(r.fromMemberId), formatEur(r.amountMinor))
                          : fr.balances.pays(name(r.fromMemberId), formatEur(r.amountMinor), name(r.toMemberId))}
                    </span>
                  </div>
                  {involvesMe && (
                    <Link href={`${settleHref}?${prefill}`} className={buttonClass("primary", "min-h-11 text-sm")}>
                      {fr.settlements.recordThis}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Link href={settleHref} className={buttonClass("secondary")}>
        <HandCoins aria-hidden="true" className="size-5" />
        {fr.settlements.record}
      </Link>

      <section aria-labelledby="everyone" className="flex flex-col gap-3">
        <SectionTitle id="everyone">{fr.balances.everyoneTitle}</SectionTitle>
        <ul className="flex flex-col divide-y divide-line rounded-3xl border border-line bg-surface">
          {balances
            .filter((b) => members.get(b.memberId)?.status === "active" || b.netMinor !== 0n)
            .map((b) => (
              <li key={b.memberId} className="flex items-center gap-3 px-4 py-3">
                {avatar(b.memberId)}
                <span className="flex-1">{name(b.memberId)}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${
                    b.netMinor > 0n
                      ? "bg-positive-tint text-positive"
                      : b.netMinor < 0n
                        ? "bg-negative-tint text-negative"
                        : "bg-neutral-tint text-muted"
                  }`}
                >
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

      <section aria-labelledby="history" className="flex flex-col gap-3">
        <SectionTitle id="history">{fr.settlements.historyTitle}</SectionTitle>
        <SettlementHistory householdId={household.id} lines={history} />
      </section>
    </Page>
  );
}
