import Link from "next/link";
import { fr } from "@/i18n/fr";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{fr.errors.notFoundTitle}</h1>
      <p>{fr.errors.notFoundBody}</p>
      <Link href="/accueil" className="font-medium underline">
        {fr.errors.home}
      </Link>
    </main>
  );
}
