"use client";

import Link from "next/link";
import { fr } from "@/i18n/fr";

// Network or server failure (§13.8): explain, offer retry, never show internals.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{fr.errors.title}</h1>
      <p className="max-w-sm">{fr.errors.body}</p>
      <button
        type="button"
        onClick={reset}
        className="min-h-12 rounded-full bg-foreground px-6 font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {fr.errors.retry}
      </button>
      <Link href="/accueil" className="font-medium underline">
        {fr.errors.home}
      </Link>
    </main>
  );
}
