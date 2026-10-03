import { fr } from "@/i18n/fr";
import { CreateHouseholdForm } from "@/modules/households/create-household-form";

export default function NewHouseholdPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">{fr.households.createTitle}</h1>
      <CreateHouseholdForm />
    </main>
  );
}
