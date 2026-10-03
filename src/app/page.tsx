import Link from "next/link";
import { fr } from "@/i18n/fr";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold">{fr.appName}</h1>
      <p className="max-w-md text-lg">{fr.tagline}</p>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Link
          href="/inscription"
          className="flex min-h-12 items-center justify-center rounded-full bg-foreground px-6 font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {fr.home.signUp}
        </Link>
        <Link
          href="/connexion"
          className="flex min-h-12 items-center justify-center rounded-full border border-zinc-400 px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {fr.home.signIn}
        </Link>
      </div>
    </main>
  );
}
