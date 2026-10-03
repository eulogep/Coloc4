import Link from "next/link";
import { ArrowRight, BookOpen, HandCoins, ReceiptText, Sparkles } from "lucide-react";
import { fr } from "@/i18n/fr";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";

const FEATURE_ICONS = [ReceiptText, HandCoins, Sparkles];

export default async function Home({ searchParams }: PageProps<"/">) {
  const { compte } = await searchParams;

  return (
    <main className="flex flex-1 flex-col gap-8 px-5 pt-10 pb-12">
      {compte === "supprime" && (
        <p role="status" className="rounded-2xl bg-positive-tint px-4 py-3 text-center">
          {fr.account.deleted}
        </p>
      )}

      <header className="flex flex-col items-center gap-4 text-center">
        <LogoMark size={88} />
        <h1 className="text-5xl font-black tracking-tight">
          Coloc<span className="text-brand">4</span>
        </h1>
        <p className="text-2xl font-extrabold leading-snug">{fr.home.headline}</p>
        <p className="text-lg text-muted">{fr.tagline}</p>
      </header>

      {/* Illustrative example of the balance sentence, so newcomers see the idea at a glance. */}
      <figure className="relative mx-2 rotate-[-1.5deg] rounded-3xl border border-line bg-surface p-5 shadow-md">
        <span className="absolute -top-3 left-5 rounded-full bg-brand px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-on-brand">
          {fr.home.exampleLabel}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <Avatar id="exemple-emma" name="Emma" size="sm" />
            <Avatar id="exemple-lucas" name="Lucas" size="sm" />
            <Avatar id="exemple-zoe" name="Zoé" size="sm" />
          </div>
          <p className="text-lg font-extrabold text-negative">{fr.home.exampleLine}</p>
        </div>
        <figcaption className="mt-2 text-sm text-muted">{fr.home.exampleHint}</figcaption>
      </figure>

      <div className="flex flex-col gap-3">
        <Link href="/inscription" className={buttonClass("primary", "w-full text-lg")}>
          {fr.home.signUp}
          <ArrowRight aria-hidden="true" className="size-5" />
        </Link>
        <Link href="/connexion" className={buttonClass("secondary", "w-full")}>
          {fr.home.signIn}
        </Link>
        <Link href="/guide" className={buttonClass("ghost", "w-full")}>
          <BookOpen aria-hidden="true" className="size-5" />
          {fr.guide.linkHome}
        </Link>
      </div>

      <ul className="flex flex-col gap-4">
        {fr.home.features.map((feature, i) => {
          const Icon = FEATURE_ICONS[i] ?? Sparkles;
          return (
            <li key={feature.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-tint text-brand"
              >
                <Icon className="size-6" />
              </span>
              <div>
                <h2 className="font-extrabold">{feature.title}</h2>
                <p className="text-muted">{feature.body}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <footer className="flex flex-col items-center gap-3 border-t border-line pt-6 text-center text-sm text-muted">
        <p>{fr.home.trust}</p>
        <Link href="/donnees" className="font-bold underline underline-offset-4">
          {fr.auth.dataLink}
        </Link>
      </footer>
    </main>
  );
}
