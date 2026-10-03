import { fr } from "@/i18n/fr";
import { NewPasswordForm } from "@/modules/auth/password-forms";

// Reached from the recovery email: /auth/confirm opened a session first.
export default function NewPasswordPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">{fr.passwordReset.newTitle}</h1>
      <NewPasswordForm />
    </main>
  );
}
