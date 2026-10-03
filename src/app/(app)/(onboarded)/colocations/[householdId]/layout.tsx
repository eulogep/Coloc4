import Link from "next/link";
import { notFound } from "next/navigation";
import { fr } from "@/i18n/fr";
import { Avatar } from "@/components/ui/avatar";
import { LogoMark } from "@/components/ui/logo";
import { getHousehold } from "@/modules/households/queries";
import { HouseholdNav } from "@/modules/households/household-nav";

export default async function HouseholdLayout({ children, params }: LayoutProps<"/colocations/[householdId]">) {
  const { householdId } = await params;
  const household = await getHousehold(householdId);
  if (!household) notFound();
  const me = household.members.find((m) => m.isMe);

  return (
    <div className="flex flex-1 flex-col pb-24">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/95 px-4 backdrop-blur">
        <div className="flex min-h-16 items-center justify-between gap-3">
          <Link href={`/colocations/${household.id}`} className="flex min-w-0 items-center gap-2 rounded-xl">
            <LogoMark size={32} />
            <span className="truncate text-lg font-extrabold">{household.name}</span>
          </Link>
          <Link href="/compte" className="flex items-center gap-2 rounded-full p-1">
            <span className="sr-only">{fr.account.link}</span>
            {me && <Avatar id={me.id} name={me.displayName} size="md" />}
          </Link>
        </div>
      </header>
      {children}
      <HouseholdNav householdId={household.id} />
    </div>
  );
}
