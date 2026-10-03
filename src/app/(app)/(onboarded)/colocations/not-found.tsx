import Link from "next/link";
import { fr } from "@/i18n/fr";

// Same page for "does not exist" and "not a member": no existence oracle.
export default function HouseholdNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{fr.households.notFoundTitle}</h1>
      <p>{fr.households.notFoundBody}</p>
      <Link href="/accueil" className="font-medium underline">
        {fr.households.backToList}
      </Link>
    </main>
  );
}
