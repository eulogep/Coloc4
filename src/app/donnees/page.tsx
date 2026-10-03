import Link from "next/link";
import { ArrowLeft, Ban, Eye, Server, Trash2, UserRound, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fr } from "@/i18n/fr";
import { Page, PageTitle } from "@/components/ui/page";

function Section({ Icon, title, children }: { Icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <section className="flex gap-4 rounded-3xl border border-line bg-surface p-5">
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-tint text-brand">
        <Icon className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="font-extrabold">{title}</h2>
        {children}
      </div>
    </section>
  );
}

// Factual description of data handling for testers. Not a legal document.
export default function DataPage() {
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <Page>
      <Link href="/" className="flex items-center gap-1 self-start py-2 font-bold text-muted hover:text-ink">
        <ArrowLeft aria-hidden="true" className="size-5" />
        {fr.errors.home}
      </Link>
      <PageTitle subtitle={fr.data.intro}>{fr.data.title}</PageTitle>
      <Section Icon={UserRound} title={fr.data.collectedTitle}>
        <ul className="list-disc pl-5 text-muted">
          {fr.data.collected.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>
      <Section Icon={Ban} title={fr.data.notCollectedTitle}>
        <p className="text-muted">{fr.data.notCollected}</p>
      </Section>
      <Section Icon={Eye} title={fr.data.visibilityTitle}>
        <p className="text-muted">{fr.data.visibility}</p>
      </Section>
      <Section Icon={Trash2} title={fr.data.deletionTitle}>
        <p className="text-muted">{fr.data.deletion}</p>
      </Section>
      <Section Icon={Server} title={fr.data.hostingTitle}>
        <p className="text-muted">{fr.data.hosting}</p>
      </Section>
      {contact && (
        <Section Icon={Mail} title={fr.data.contactTitle}>
          <p className="text-muted">{fr.data.contact(contact)}</p>
        </Section>
      )}
    </Page>
  );
}
