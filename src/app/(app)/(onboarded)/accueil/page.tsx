import Link from "next/link";
import { redirect } from "next/navigation";
import { fr } from "@/i18n/fr";
import { listMyHouseholds } from "@/modules/households/queries";
import { getMyProfile } from "@/modules/profiles/queries";

export default async function AppHomePage() {
  const [profile, households] = await Promise.all([getMyProfile(), listMyHouseholds()]);
  if (!profile) redirect("/profil");
  if (households.length === 1 && households[0]) redirect(`/colocations/${households[0].id}`);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">{fr.app.greeting(profile.displayName)}</h1>

      {households.length === 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">{fr.households.emptyTitle}</h2>
          <p>{fr.households.emptyHint}</p>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">{fr.households.listTitle}</h2>
          <ul className="flex flex-col gap-2">
            {households.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/colocations/${h.id}`}
                  className="flex min-h-12 items-center rounded-lg border border-zinc-400 px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {h.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href="/colocations/nouvelle"
        className="flex min-h-12 items-center justify-center rounded-full bg-foreground px-6 font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {fr.households.create}
      </Link>

      <Link
        href="/compte"
        className="flex min-h-12 items-center justify-center rounded-full border border-zinc-400 px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {fr.account.link}
      </Link>
    </main>
  );
}
