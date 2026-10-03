import Link from "next/link";
import { fr } from "@/i18n/fr";

export default function SignInPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{fr.signIn.title}</h1>
      <p>{fr.signIn.comingSoon}</p>
      <Link href="/" className="underline focus-visible:outline-2 focus-visible:outline-offset-2">
        {fr.signIn.backHome}
      </Link>
    </main>
  );
}
