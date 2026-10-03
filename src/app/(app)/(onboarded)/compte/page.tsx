import Link from "next/link";
import { redirect } from "next/navigation";
import { fr } from "@/i18n/fr";
import { signOut } from "@/modules/auth/actions";
import { DeleteAccountForm } from "@/modules/auth/delete-account-form";
import { listMyHouseholds } from "@/modules/households/queries";
import { getMyProfile } from "@/modules/profiles/queries";

const linkClass =
  "flex min-h-12 items-center rounded-lg border border-zinc-400 px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2";

export default async function AccountPage() {
  const [profile, households] = await Promise.all([getMyProfile(), listMyHouseholds()]);
  if (!profile) redirect("/profil");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">{fr.account.title}</h1>
      <p className="text-lg">{fr.app.greeting(profile.displayName)}</p>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">{fr.households.listTitle}</h2>
        {households.length === 0 ? (
          <p>{fr.households.emptyTitle}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {households.map((h) => (
              <li key={h.id}>
                <Link href={`/colocations/${h.id}`} className={linkClass}>
                  {h.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/colocations/nouvelle" className={linkClass}>
          {fr.households.create}
        </Link>
      </section>

      <section className="flex flex-col gap-2">
        <Link href="/profil" className={linkClass}>
          {fr.account.editName}
        </Link>
        <form action={signOut}>
          <button type="submit" className={`${linkClass} w-full`}>
            {fr.auth.signOut}
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-2 rounded-lg border border-red-700 p-4">
        <h2 className="text-lg font-medium">{fr.account.deleteTitle}</h2>
        <p className="text-sm">{fr.account.deleteIntro}</p>
        <DeleteAccountForm />
      </section>
    </main>
  );
}
