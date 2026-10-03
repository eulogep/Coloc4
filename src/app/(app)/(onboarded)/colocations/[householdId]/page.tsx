import { notFound } from "next/navigation";
import { fr } from "@/i18n/fr";
import { getHousehold } from "@/modules/households/queries";

export default async function HouseholdPage({ params }: PageProps<"/colocations/[householdId]">) {
  const { householdId } = await params;
  const household = await getHousehold(householdId);
  if (!household) notFound();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">{household.name}</h1>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{fr.households.members}</h2>
        <ul className="flex flex-col gap-2">
          {household.members.map((m) => (
            <li key={m.id} className="flex min-h-12 items-center rounded-lg border border-zinc-300 px-4">
              <span className="font-medium">{m.displayName}</span>
              {m.isMe && <span className="ml-1">({fr.households.you})</span>}
              {m.role === "owner" && <span className="ml-auto text-sm">{fr.households.owner}</span>}
              {m.status !== "active" && (
                <span className="ml-auto text-sm">{fr.households.formerMember}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
