type Props = { error?: string | null; info?: string | null }

// Announced to screen readers; errors are prefixed with text, not only colour.
export function FormMessage({ error, info }: Props) {
  if (error) {
    return (
      <p role="alert" className="rounded-lg border border-red-700 px-3 py-2 text-left text-red-800 dark:text-red-300">
        {error}
      </p>
    )
  }
  if (info) {
    return (
      <p role="status" className="rounded-lg border border-zinc-500 px-3 py-2 text-left">
        {info}
      </p>
    )
  }
  return null
}
