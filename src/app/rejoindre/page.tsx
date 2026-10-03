import { fr } from "@/i18n/fr";
import { JoinFlow } from "@/modules/invitations/join-flow";

export default function JoinPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">{fr.join.title}</h1>
      <JoinFlow />
    </main>
  );
}
