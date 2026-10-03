// Roommate badge: initial on one of the four "pane" tints, chosen from the member id
// so a person keeps the same colour everywhere. Decorative: the name is always written next to it.
const TONES = [
  'bg-[var(--avatar-brique-bg)] text-[var(--avatar-brique-ink)]',
  'bg-[var(--avatar-moutarde-bg)] text-[var(--avatar-moutarde-ink)]',
  'bg-[var(--avatar-sauge-bg)] text-[var(--avatar-sauge-ink)]',
  'bg-[var(--avatar-ciel-bg)] text-[var(--avatar-ciel-ink)]',
] as const

export function toneIndex(id: string): number {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return hash % TONES.length
}

const SIZES = { sm: 'size-8 text-sm', md: 'size-10 text-base', lg: 'size-14 text-xl' } as const

export function Avatar({
  id,
  name,
  size = 'md',
  muted = false,
}: {
  id: string
  name: string
  size?: keyof typeof SIZES
  muted?: boolean
}) {
  const initial = [...name.trim()][0]?.toUpperCase() ?? '?'
  const tone = muted ? 'bg-neutral-tint text-muted' : TONES[toneIndex(id)]
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-extrabold ${SIZES[size]} ${tone}`}
    >
      {initial}
    </span>
  )
}
