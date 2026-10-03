import Link from "next/link";
import { fr } from "@/i18n/fr";
import { ForgotPasswordForm } from "@/modules/auth/password-forms";

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">{fr.passwordReset.title}</h1>
      <p className="max-w-sm text-center">{fr.passwordReset.intro}</p>
      <ForgotPasswordForm />
      <Link href="/connexion" className="font-medium underline">
        {fr.passwordReset.backToSignIn}
      </Link>
    </main>
  );
}
