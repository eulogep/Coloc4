import { redirect } from "next/navigation";
import { getMyProfile } from "@/modules/profiles/queries";

// Routes that need a display name: send first-time users to onboarding.
export default async function OnboardedLayout({ children }: LayoutProps<"/">) {
  const profile = await getMyProfile();
  if (!profile) redirect("/profil");
  return <>{children}</>;
}
