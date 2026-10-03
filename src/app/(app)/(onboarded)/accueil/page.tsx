import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, ChevronRight, House, Plus, UserRound } from "lucide-react";
import { fr } from "@/i18n/fr";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Logo } from "@/components/ui/logo";
import { Page, SectionTitle } from "@/components/ui/page";
import { listMyHouseholds } from "@/modules/households/queries";
import { getMyProfile } from "@/modules/profiles/queries";

export default async function AppHomePage() {
  const [profile, households] = await Promise.all([getMyProfile(), listMyHouseholds()]);
  if (!profile) redirect("/profil");
  if (households.length === 1 && households[0]) redirect(`/colocations/${households[0].id}`);

  return (
    <Page>
      <Logo size={32} className="text-xl" />
      <h1 className="text-3xl font-extrabold tracking-tight">{fr.app.greeting(profile.displayName)}</h1>

      {households.length === 0 ? (
        <EmptyState icon={<House className="size-8" />} title={fr.households.emptyTitle} hint={fr.households.emptyHint} />
      ) : (
        <section className="flex flex-col gap-3">
          <SectionTitle>{fr.households.listTitle}</SectionTitle>
          <ul className="flex flex-col gap-3">
            {households.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/colocations/${h.id}`}
                  className="flex min-h-16 items-center gap-3 rounded-3xl border border-line bg-surface px-4 font-extrabold shadow-sm"
                >
                  <House aria-hidden="true" className="size-6 text-brand" />
                  <span className="flex-1">{h.name}</span>
                  <ChevronRight aria-hidden="true" className="size-5 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/colocations/nouvelle" className={buttonClass("primary")}>
        <Plus aria-hidden="true" className="size-5" strokeWidth={3} />
        {fr.households.create}
      </Link>
      <Link href="/compte" className={buttonClass("secondary")}>
        <UserRound aria-hidden="true" className="size-5" />
        {fr.account.link}
      </Link>
      <Link href="/guide" className={buttonClass("ghost")}>
        <BookOpen aria-hidden="true" className="size-5" />
        {fr.guide.linkHome}
      </Link>
    </Page>
  );
}
