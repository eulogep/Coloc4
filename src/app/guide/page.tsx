import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fr } from "@/i18n/fr";
import { Page, PageTitle } from "@/components/ui/page";
import { createClient } from "@/lib/supabase/server";
import { Guide } from "@/modules/guide/guide";

export const metadata = { title: `${fr.guide.title} — ${fr.appName}` };

// Public: usable before signing up. Only the call-to-action depends on the session.
export default async function GuidePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  return (
    <Page>
      <Link href={signedIn ? "/accueil" : "/"} className="flex items-center gap-1 self-start py-2 font-bold text-muted hover:text-ink">
        <ArrowLeft aria-hidden="true" className="size-5" />
        {fr.errors.home}
      </Link>
      <PageTitle subtitle={fr.guide.intro}>{fr.guide.title}</PageTitle>
      <Guide signedIn={signedIn} />
    </Page>
  );
}
