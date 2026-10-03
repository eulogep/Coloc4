import { redirect } from "next/navigation";
import { fr } from "@/i18n/fr";
import { signOut } from "@/modules/auth/actions";
import { getMyProfile } from "@/modules/profiles/queries";

export default async function AppHomePage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/profil");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">{fr.app.greeting(profile.displayName)}</h1>
      <form action={signOut}>
        <button
          type="submit"
          className="min-h-12 rounded-full border border-zinc-400 px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {fr.auth.signOut}
        </button>
      </form>
    </main>
  );
}
