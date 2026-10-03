'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { fr } from '@/i18n/fr'

// M1 shows only modules that exist (§13.3).
export function HouseholdNav({ householdId }: { householdId: string }) {
  const pathname = usePathname()
  const base = `/colocations/${householdId}`
  const items = [
    { href: `${base}/depenses`, label: fr.nav.expenses },
    { href: `${base}/membres`, label: fr.nav.household },
  ]

  return (
    <nav aria-label={fr.nav.label} className="fixed inset-x-0 bottom-0 border-t border-zinc-300 bg-background">
      <ul className="mx-auto flex max-w-md">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 items-center justify-center font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 ${
                  active ? 'underline decoration-2 underline-offset-8' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
