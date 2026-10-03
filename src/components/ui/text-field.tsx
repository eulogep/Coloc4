import type { InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> & {
  id: string
  label: string
  hint?: string
  /** Big, bold input for the one value that matters most on a screen (e.g. an amount). */
  large?: boolean
}

export const fieldBase =
  'w-full rounded-2xl border-2 border-field bg-surface px-4 text-ink placeholder:text-muted focus-visible:border-brand'

export const fieldClass = `${fieldBase} min-h-12 text-base`

export function TextField({ id, label, hint, large = false, ...input }: Props) {
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hintId}
        className={large ? `${fieldBase} min-h-16 text-3xl font-black` : fieldClass}
        {...input}
      />
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
