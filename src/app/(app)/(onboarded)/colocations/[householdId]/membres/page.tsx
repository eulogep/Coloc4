import { notFound } from "next/navigation";
import { fr } from "@/i18n/fr";
import { Avatar } from "@/components/ui/avatar";
import { LogoMark } from "@/components/ui/logo";
import { Page, SectionTitle } from "@/components/ui/page";
import { getHouseholdBalances } from "@/modules/expenses/balances-query";
import { formatEur } from "@/modules/expenses/domain/money";
import { LifecyclePanel } from "@/modules/households/lifecycle-panel";
import { getHousehold } from "@/modules/households/queries";
import { InvitePanel } from "@/modules/invitations/invite-panel";
import { listActiveInvitations } from "@/modules/invitations/queries";

export default async function MembersPage({ params }: PageProps<"/colocations/[householdId]/membres">) {
  const { householdId } = await params;
  const household = await getHousehold(householdId);
  if (!household) notFound();
  const [invitations, balances] = await Promise.all([
    listActiveInvitations(household.id),
    getHouseholdBalances(household.id, household.members.map((m) => m.id)),
  ]);
  const myNet = balances.ok ? (balances.balances.find((b) => b.memberId === household.myMemberId)?.netMinor ?? 0n) : 0n;
  const balanceSentence =
    myNet > 0n ? fr.balances.owedToYou(formatEur(myNet)) : myNet < 0n ? fr.balances.youOwe(formatEur(-myNet)) : null;
  const me = household.members.find((m) => m.isMe);
  const active = household.members.filter((m) => m.status === "active");

  return (
    <Page>
      <header className="flex items-center gap-4">
        <LogoMark size={56} />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{household.name}</h1>
          <p className="text-muted">
            {active.length} {active.length > 1 ? fr.households.activeMany : fr.households.activeOne}
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <SectionTitle>{fr.households.members}</SectionTitle>
        <ul className="flex flex-col divide-y divide-line rounded-3xl border border-line bg-surface">
          {household.members.map((m) => (
            <li key={m.id} className="flex min-h-16 items-center gap-3 px-4 py-2">
              <Avatar id={m.id} name={m.displayName} muted={m.status !== "active"} />
              <span className="flex-1">
                <span className="font-bold">{m.displayName}</span>
                {m.isMe && <span className="ml-1 text-muted">({fr.households.you})</span>}
              </span>
              {m.role === "owner" && (
                <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-sm font-bold text-brand-strong">
                  {fr.households.owner}
                </span>
              )}
              {m.status !== "active" && (
                <span className="rounded-full bg-neutral-tint px-2.5 py-0.5 text-sm font-bold text-muted">
                  {fr.households.formerMember}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <InvitePanel
        householdId={household.id}
        householdName={household.name}
        timezone={household.timezone}
        invitations={invitations}
      />
      <LifecyclePanel
        householdId={household.id}
        isOwner={me?.role === "owner"}
        balanceSentence={balanceSentence}
        transferCandidates={household.members
          .filter((m) => m.status === "active" && !m.isMe)
          .map((m) => ({ id: m.id, displayName: m.displayName }))}
      />
    </Page>
  );
}
