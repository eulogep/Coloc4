import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Every route in this group requires a verified session.
// getClaims() verifies the JWT; getSession() alone must not be trusted on the server.
export default async function AuthenticatedLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/connexion");
  }

  return <>{children}</>;
}
