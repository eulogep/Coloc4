'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, ReceiptText, Scale } from 'lucide-react'
import { fr } from '@/i18n/fr'

// M1 shows only modules that exist (§13.3).
export function HouseholdNav({ householdId }: { householdId: string }) {
  const pathname = usePathname()
  const base = `/colocations/${householdId}`
  const items = [
    { href: `${base}/depenses`, label: fr.nav.expenses, Icon: ReceiptText },
    { href: `${base}/soldes`, label: fr.nav.balances, Icon: Scale },
    { href: `${base}/membres`, label: fr.nav.household, Icon: House },
  ]

  return (
    <nav
      aria-label={fr.nav.label}
      className="fixed bottom-0 left-1/2 z-10 w-full max-w-md -translate-x-1/2 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="flex px-2 py-1.5">
        {items.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-sm font-bold transition-colors ${
                  active ? 'bg-brand-tint text-brand-strong' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon aria-hidden="true" className="size-6" strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
