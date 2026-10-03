import { CircleAlert, Info } from 'lucide-react'

type Props = { error?: string | null; info?: string | null }

// Announced to screen readers; errors carry an icon and text, not only colour.
export function FormMessage({ error, info }: Props) {
  if (error) {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-2xl bg-danger-tint px-4 py-3 text-left font-semibold text-danger">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <span>{error}</span>
      </p>
    )
  }
  if (info) {
    return (
      <p role="status" className="flex items-start gap-2 rounded-2xl bg-positive-tint px-4 py-3 text-left text-ink">
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-positive" />
        <span>{info}</span>
      </p>
    )
  }
  return null
}
