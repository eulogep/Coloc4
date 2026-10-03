import type { ReactNode } from 'react'
import { LogoMark } from './logo'

/** Full-page message (404, errors): the house mark, a title, a sentence, actions. */
export function MessagePage({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <LogoMark size={72} className="opacity-90" />
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="max-w-sm text-muted">{body}</p>
      <div className="flex w-full max-w-xs flex-col gap-3">{children}</div>
    </main>
  )
}
