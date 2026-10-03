import { fr } from "@/i18n/fr";
import { AuthShell } from "@/components/ui/auth-shell";
import { CreateHouseholdForm } from "@/modules/households/create-household-form";

export default function NewHouseholdPage() {
  return (
    <AuthShell title={fr.households.createTitle} intro={fr.households.createIntro}>
      <CreateHouseholdForm />
    </AuthShell>
  );
}
