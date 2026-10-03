import Link from "next/link";
import { fr } from "@/i18n/fr";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold">{fr.appName}</h1>
      <p className="max-w-md text-lg">{fr.tagline}</p>
      <Link
        href="/connexion"
        className="flex min-h-12 items-center rounded-full bg-foreground px-6 font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {fr.home.signIn}
      </Link>
    </main>
  );
}
