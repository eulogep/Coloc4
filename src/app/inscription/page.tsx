import Link from "next/link";
import { fr } from "@/i18n/fr";
import { AuthForm } from "@/modules/auth/auth-form";
import { safeNextPath } from "@/modules/auth/redirect";

export default async function SignUpPage({ searchParams }: PageProps<"/inscription">) {
  const { suivant } = await searchParams;
  const next = safeNextPath(suivant);
  const signInHref = next === "/accueil" ? "/connexion" : `/connexion?suivant=${encodeURIComponent(next)}`;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">{fr.auth.signUpTitle}</h1>
      <AuthForm mode="sign-up" next={next} />
      <p>
        {fr.auth.haveAccount}{" "}
        <Link href={signInHref} className="font-medium underline">
          {fr.home.signIn}
        </Link>
      </p>
      <Link href="/donnees" className="text-sm underline">
        {fr.auth.dataLink}
      </Link>
    </main>
  );
}
