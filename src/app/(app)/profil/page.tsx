import { fr } from "@/i18n/fr";
import { getMyProfile } from "@/modules/profiles/queries";
import { ProfileForm } from "@/modules/profiles/profile-form";

export default async function ProfilePage() {
  const profile = await getMyProfile();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">{fr.profile.title}</h1>
      <p>{fr.profile.intro}</p>
      <ProfileForm initialDisplayName={profile?.displayName ?? ""} />
    </main>
  );
}
