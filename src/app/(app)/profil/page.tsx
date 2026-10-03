import { fr } from "@/i18n/fr";
import { AuthShell } from "@/components/ui/auth-shell";
import { safeNextPath } from "@/modules/auth/redirect";
import { getMyProfile } from "@/modules/profiles/queries";
import { ProfileForm } from "@/modules/profiles/profile-form";

export default async function ProfilePage({ searchParams }: PageProps<"/profil">) {
  const [{ suivant }, profile] = await Promise.all([searchParams, getMyProfile()]);

  return (
    <AuthShell title={fr.profile.title} intro={fr.profile.intro}>
      <ProfileForm initialDisplayName={profile?.displayName ?? ""} next={safeNextPath(suivant)} />
    </AuthShell>
  );
}
