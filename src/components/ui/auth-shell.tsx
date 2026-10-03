import Link from 'next/link'
import type { ReactNode } from 'react'
import { fr } from '@/i18n/fr'
import { Card } from './card'
import { Logo } from './logo'

/** Frame for sign-in, sign-up and other single-form pages: logo on top, one card. */
export function AuthShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string
  intro?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="flex flex-1 flex-col gap-6 px-4 pt-8 pb-10">
      <Link href="/" aria-label={fr.home.backHome} className="self-center rounded-xl text-2xl">
        <Logo size={40} />
      </Link>
      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          {intro && <p className="text-muted">{intro}</p>}
        </div>
        {children}
      </Card>
      {footer && <div className="flex flex-col items-center gap-3 text-center">{footer}</div>}
    </main>
  )
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-bold text-brand underline decoration-2 underline-offset-4">
      {children}
    </Link>
  )
}
