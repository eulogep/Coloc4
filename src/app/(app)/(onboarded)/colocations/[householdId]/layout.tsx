import Link from "next/link";
import { notFound } from "next/navigation";
import { fr } from "@/i18n/fr";
import { getHousehold } from "@/modules/households/queries";
import { HouseholdNav } from "@/modules/households/household-nav";

export default async function HouseholdLayout({ children, params }: LayoutProps<"/colocations/[householdId]">) {
  const { householdId } = await params;
  const household = await getHousehold(householdId);
  if (!household) notFound();

  return (
    <div className="flex flex-1 flex-col pb-20">
      <header className="border-b border-zinc-300 px-4">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2">
          <Link href={`/colocations/${household.id}`} className="flex min-h-12 items-center font-semibold">
            {household.name}
          </Link>
          <Link href="/compte" className="flex min-h-12 items-center text-sm underline">
            {fr.account.link}
          </Link>
        </div>
      </header>
      {children}
      <HouseholdNav householdId={household.id} />
    </div>
  );
}
