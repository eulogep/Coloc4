import { fr } from "@/i18n/fr";
import { AuthShell, TextLink } from "@/components/ui/auth-shell";
import { ForgotPasswordForm } from "@/modules/auth/password-forms";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title={fr.passwordReset.title}
      intro={fr.passwordReset.intro}
      footer={<TextLink href="/connexion">{fr.passwordReset.backToSignIn}</TextLink>}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
