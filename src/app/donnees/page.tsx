import Link from "next/link";
import { fr } from "@/i18n/fr";

// Factual description of data handling for testers. Not a legal document.
export default function DataPage() {
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const sections: [string, string][] = [
    [fr.data.visibilityTitle, fr.data.visibility],
    [fr.data.deletionTitle, fr.data.deletion],
    [fr.data.hostingTitle, fr.data.hosting],
  ];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-10">
      <h1 className="text-2xl font-semibold">{fr.data.title}</h1>
      <p>{fr.data.intro}</p>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">{fr.data.collectedTitle}</h2>
        <ul className="list-disc pl-5">
          {fr.data.collected.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">{fr.data.notCollectedTitle}</h2>
        <p>{fr.data.notCollected}</p>
      </section>
      {sections.map(([title, body]) => (
        <section key={title} className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">{title}</h2>
          <p>{body}</p>
        </section>
      ))}
      {contact && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">{fr.data.contactTitle}</h2>
          <p>{fr.data.contact(contact)}</p>
        </section>
      )}
      <Link href="/" className="font-medium underline">
        {fr.errors.home}
      </Link>
    </main>
  );
}
