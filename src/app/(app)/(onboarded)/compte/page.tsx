import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, ChevronRight, House, LogOut, Pencil, Plus, ShieldCheck } from "lucide-react";
import { fr } from "@/i18n/fr";
import { Avatar } from "@/components/ui/avatar";
import { Page, PageTitle, SectionTitle } from "@/components/ui/page";
import { signOut } from "@/modules/auth/actions";
import { DeleteAccountForm } from "@/modules/auth/delete-account-form";
import { listMyHouseholds } from "@/modules/households/queries";
import { getMyProfile } from "@/modules/profiles/queries";

const rowClass = "flex min-h-14 w-full items-center gap-3 px-4 text-left font-bold hover:bg-surface-muted";

export default async function AccountPage() {
  const [profile, households] = await Promise.all([getMyProfile(), listMyHouseholds()]);
  if (!profile) redirect("/profil");

  return (
    <Page>
      <PageTitle>{fr.account.title}</PageTitle>
      <div className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-5">
        <Avatar id={profile.displayName} name={profile.displayName} size="lg" />
        <p className="text-xl font-extrabold">{fr.app.greeting(profile.displayName)}</p>
      </div>

      <section className="flex flex-col gap-3">
        <SectionTitle>{fr.households.listTitle}</SectionTitle>
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
          {households.length === 0 && <li className="px-4 py-4 text-muted">{fr.households.emptyTitle}</li>}
          {households.map((h) => (
            <li key={h.id}>
              <Link href={`/colocations/${h.id}`} className={rowClass}>
                <House aria-hidden="true" className="size-5 text-brand" />
                <span className="flex-1">{h.name}</span>
                <ChevronRight aria-hidden="true" className="size-5 text-muted" />
              </Link>
            </li>
          ))}
          <li>
            <Link href="/colocations/nouvelle" className={rowClass}>
              <Plus aria-hidden="true" className="size-5 text-brand" />
              <span className="flex-1">{fr.households.create}</span>
            </Link>
          </li>
        </ul>
      </section>

      <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
        <li>
          <Link href="/profil" className={rowClass}>
            <Pencil aria-hidden="true" className="size-5 text-muted" />
            <span className="flex-1">{fr.account.editName}</span>
          </Link>
        </li>
        <li>
          <Link href="/guide" className={rowClass}>
            <BookOpen aria-hidden="true" className="size-5 text-brand" />
            <span className="flex-1">{fr.guide.link}</span>
          </Link>
        </li>
        <li>
          <Link href="/donnees" className={rowClass}>
            <ShieldCheck aria-hidden="true" className="size-5 text-muted" />
            <span className="flex-1">{fr.auth.dataLink}</span>
          </Link>
        </li>
        <li>
          <form action={signOut}>
            <button type="submit" className={rowClass}>
              <LogOut aria-hidden="true" className="size-5 text-muted" />
              <span className="flex-1">{fr.auth.signOut}</span>
            </button>
          </form>
        </li>
      </ul>

      <section className="flex flex-col gap-3 rounded-3xl border-2 border-danger/40 bg-surface p-5">
        <SectionTitle>{fr.account.deleteTitle}</SectionTitle>
        <p className="text-sm text-muted">{fr.account.deleteIntro}</p>
        <DeleteAccountForm />
      </section>
    </Page>
  );
}
