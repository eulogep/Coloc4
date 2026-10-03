// Shared button styles for <button> and <Link>. Pill shape, 48px+ touch targets.
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline'

const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-on-brand shadow-sm hover:bg-brand-strong',
  secondary: 'border-2 border-line bg-surface text-ink hover:border-field',
  ghost: 'text-ink underline-offset-4 hover:underline',
  danger: 'bg-danger text-white dark:text-canvas',
  'danger-outline': 'border-2 border-danger bg-surface text-danger',
}

export function buttonClass(variant: ButtonVariant = 'primary', extra = ''): string {
  return `${base} ${variants[variant]} ${extra}`.trim()
}
