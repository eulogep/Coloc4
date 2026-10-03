import type { ReactNode } from 'react'

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-line px-6 py-10 text-center">
      <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-brand-tint text-brand">
        {icon}
      </span>
      <p className="text-lg font-bold">{title}</p>
      {hint && <p className="text-muted">{hint}</p>}
    </section>
  )
}
