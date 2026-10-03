import Link from "next/link";
import { fr } from "@/i18n/fr";
import { AuthShell, TextLink } from "@/components/ui/auth-shell";
import { AuthForm } from "@/modules/auth/auth-form";
import { safeNextPath } from "@/modules/auth/redirect";

export default async function SignUpPage({ searchParams }: PageProps<"/inscription">) {
  const { suivant } = await searchParams;
  const next = safeNextPath(suivant);
  const signInHref = next === "/accueil" ? "/connexion" : `/connexion?suivant=${encodeURIComponent(next)}`;

  return (
    <AuthShell
      title={fr.auth.signUpTitle}
      footer={
        <>
          <p>
            {fr.auth.haveAccount} <TextLink href={signInHref}>{fr.home.signIn}</TextLink>
          </p>
          <Link href="/donnees" className="text-sm text-muted underline underline-offset-4">
            {fr.auth.dataLink}
          </Link>
        </>
      }
    >
      <AuthForm mode="sign-up" next={next} />
    </AuthShell>
  );
}
