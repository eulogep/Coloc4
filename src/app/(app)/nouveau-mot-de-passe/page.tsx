import { fr } from "@/i18n/fr";
import { AuthShell } from "@/components/ui/auth-shell";
import { NewPasswordForm } from "@/modules/auth/password-forms";

// Reached from the recovery email: /auth/confirm opened a session first.
export default function NewPasswordPage() {
  return (
    <AuthShell title={fr.passwordReset.newTitle}>
      <NewPasswordForm />
    </AuthShell>
  );
}
