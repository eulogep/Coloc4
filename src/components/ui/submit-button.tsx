type Props = { pending: boolean; label: string; pendingLabel: string }

export function SubmitButton({ pending, label, pendingLabel }: Props) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 rounded-full bg-foreground px-6 font-medium text-background disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}
