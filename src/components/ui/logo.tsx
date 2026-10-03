// The Coloc4 mark: one roof, a window of four panes — four people, four colours, one home.
export function LogoMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M6 22.5 24 7l18 15.5V40a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z"
        fill="var(--surface)"
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect x="14.5" y="20" width="9" height="9" rx="2" fill="var(--pane-brique)" />
      <rect x="24.5" y="20" width="9" height="9" rx="2" fill="var(--pane-moutarde)" />
      <rect x="14.5" y="30" width="9" height="9" rx="2" fill="var(--pane-sauge)" />
      <rect x="24.5" y="30" width="9" height="9" rx="2" fill="var(--pane-ciel)" />
    </svg>
  )
}

/** Mark + wordmark. The text is real text, so it is read by screen readers. */
export function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <LogoMark size={size} />
      <span>
        Coloc<span className="text-brand">4</span>
      </span>
    </span>
  )
}
