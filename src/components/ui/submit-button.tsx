import { LoaderCircle } from 'lucide-react'
import { buttonClass } from './button'

type Props = { pending: boolean; label: string; pendingLabel: string }

export function SubmitButton({ pending, label, pendingLabel }: Props) {
  return (
    <button type="submit" disabled={pending} className={buttonClass('primary', 'w-full')}>
      {pending && <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />}
      {pending ? pendingLabel : label}
    </button>
  )
}
