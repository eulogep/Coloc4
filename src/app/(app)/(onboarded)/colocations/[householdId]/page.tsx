import { redirect } from "next/navigation";

export default async function HouseholdIndex({ params }: PageProps<"/colocations/[householdId]">) {
  const { householdId } = await params;
  redirect(`/colocations/${householdId}/depenses`);
}
