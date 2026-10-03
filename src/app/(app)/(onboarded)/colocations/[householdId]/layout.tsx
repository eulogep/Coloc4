import Link from "next/link";
import { notFound } from "next/navigation";
import { getHousehold } from "@/modules/households/queries";
import { HouseholdNav } from "@/modules/households/household-nav";

export default async function HouseholdLayout({ children, params }: LayoutProps<"/colocations/[householdId]">) {
  const { householdId } = await params;
  const household = await getHousehold(householdId);
  if (!household) notFound();

  return (
    <div className="flex flex-1 flex-col pb-20">
      <header className="border-b border-zinc-300 px-4 py-3">
        <Link href="/accueil" className="mx-auto block max-w-md font-semibold">
          {household.name}
        </Link>
      </header>
      {children}
      <HouseholdNav householdId={household.id} />
    </div>
  );
}
