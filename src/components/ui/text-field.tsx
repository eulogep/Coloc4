import type { InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> & {
  id: string
  label: string
  hint?: string
}

export function TextField({ id, label, hint, ...input }: Props) {
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div className="flex flex-col gap-1 text-left">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hintId}
        className="min-h-12 rounded-lg border border-zinc-400 bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2"
        {...input}
      />
      {hint && (
        <p id={hintId} className="text-sm text-zinc-600 dark:text-zinc-400">
          {hint}
        </p>
      )}
    </div>
  )
}
