import { fr } from "@/i18n/fr";

export default function AppHomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold">{fr.app.welcome}</h1>
    </main>
  );
}
