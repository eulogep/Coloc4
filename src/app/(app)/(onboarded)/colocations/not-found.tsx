import Link from "next/link";
import { fr } from "@/i18n/fr";
import { buttonClass } from "@/components/ui/button";
import { MessagePage } from "@/components/ui/message-page";

// Same page for "does not exist" and "not a member": no existence oracle.
export default function HouseholdNotFound() {
  return (
    <MessagePage title={fr.households.notFoundTitle} body={fr.households.notFoundBody}>
      <Link href="/accueil" className={buttonClass("primary")}>
        {fr.households.backToList}
      </Link>
    </MessagePage>
  );
}
