import Link from "next/link";
import { fr } from "@/i18n/fr";
import { AuthForm } from "@/modules/auth/auth-form";
import { safeNextPath } from "@/modules/auth/redirect";

export default async function SignInPage({ searchParams }: PageProps<"/connexion">) {
  const { suivant } = await searchParams;
  const next = safeNextPath(suivant);
  const signUpHref = next === "/accueil" ? "/inscription" : `/inscription?suivant=${encodeURIComponent(next)}`;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">{fr.auth.signInTitle}</h1>
      <AuthForm mode="sign-in" next={next} />
      <p>
        {fr.auth.noAccount}{" "}
        <Link href={signUpHref} className="font-medium underline">
          {fr.home.signUp}
        </Link>
      </p>
    </main>
  );
}
