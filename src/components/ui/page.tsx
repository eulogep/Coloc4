import type { ReactNode } from 'react'

/** Standard page body inside the app frame. */
export function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <main className={`flex w-full flex-1 flex-col gap-5 px-4 pt-6 pb-8 ${className}`}>{children}</main>
}

export function PageTitle({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-3xl font-extrabold tracking-tight">{children}</h1>
      {subtitle && <p className="text-muted">{subtitle}</p>}
    </div>
  )
}

export function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-lg font-extrabold">
      {children}
    </h2>
  )
}
