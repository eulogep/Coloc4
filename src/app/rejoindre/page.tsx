import { fr } from "@/i18n/fr";
import { AuthShell } from "@/components/ui/auth-shell";
import { JoinFlow } from "@/modules/invitations/join-flow";

export default function JoinPage() {
  return (
    <AuthShell title={fr.join.title}>
      <JoinFlow />
    </AuthShell>
  );
}
