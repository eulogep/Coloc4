import { requireUser } from "@/modules/auth/session";

// Every route in this group requires a verified session (getClaims, not getSession).
export default async function AuthenticatedLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return <>{children}</>;
}
