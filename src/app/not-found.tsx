import Link from "next/link";
import { fr } from "@/i18n/fr";
import { buttonClass } from "@/components/ui/button";
import { MessagePage } from "@/components/ui/message-page";

export default function NotFound() {
  return (
    <MessagePage title={fr.errors.notFoundTitle} body={fr.errors.notFoundBody}>
      <Link href="/accueil" className={buttonClass("primary")}>
        {fr.errors.home}
      </Link>
    </MessagePage>
  );
}
