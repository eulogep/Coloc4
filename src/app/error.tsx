"use client";

import Link from "next/link";
import { fr } from "@/i18n/fr";
import { buttonClass } from "@/components/ui/button";
import { MessagePage } from "@/components/ui/message-page";

// Network or server failure (§13.8): explain, offer retry, never show internals.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <MessagePage title={fr.errors.title} body={fr.errors.body}>
      <button type="button" onClick={reset} className={buttonClass("primary")}>
        {fr.errors.retry}
      </button>
      <Link href="/accueil" className={buttonClass("secondary")}>
        {fr.errors.home}
      </Link>
    </MessagePage>
  );
}
