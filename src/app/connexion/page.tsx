import Link from "next/link";
import { fr } from "@/i18n/fr";
import { AuthShell, TextLink } from "@/components/ui/auth-shell";
import { AuthForm } from "@/modules/auth/auth-form";
import { safeNextPath } from "@/modules/auth/redirect";

export default async function SignInPage({ searchParams }: PageProps<"/connexion">) {
  const { suivant, erreur } = await searchParams;
  const next = safeNextPath(suivant);
  const signUpHref = next === "/accueil" ? "/inscription" : `/inscription?suivant=${encodeURIComponent(next)}`;

  return (
    <AuthShell
      title={fr.auth.signInTitle}
      footer={
        <p>
          {fr.auth.noAccount} <TextLink href={signUpHref}>{fr.home.signUp}</TextLink>
        </p>
      }
    >
      {erreur === "lien" && (
        <p role="alert" className="rounded-2xl bg-danger-tint px-4 py-3 font-semibold text-danger">
          {fr.auth.linkInvalid}
        </p>
      )}
      <AuthForm mode="sign-in" next={next} />
      <Link href="/mot-de-passe-oublie" className="self-center font-bold underline underline-offset-4">
        {fr.auth.forgotPassword}
      </Link>
    </AuthShell>
  );
}
