// Decorative arcane corner marks. Drop inside any position:relative container.
// Each corner has a unique inner mark so they feel like distinct rune glyphs.

type Corner = 'tl' | 'tr' | 'bl' | 'br'

interface Props {
  size?:    number
  color?:   string
  opacity?: number
  skip?:    Corner[]
}

const CORNERS: { id: Corner; style: React.CSSProperties; d: string }[] = [
  {
    id: 'tl',
    style: { top: 0, left: 0 },
    // bracket + vertical tick + horizontal tick + diagonal inner
    d: 'M 17 1.5 L 1.5 1.5 L 1.5 17  M 9 1.5 L 9 5.5  M 1.5 10 L 5.5 10  M 6.5 6.5 L 10 10',
  },
  {
    id: 'tr',
    style: { top: 0, right: 0 },
    // bracket + vertical tick + horizontal tick + horizontal inner
    d: 'M 11 1.5 L 26.5 1.5 L 26.5 17  M 19 1.5 L 19 5.5  M 26.5 10 L 22.5 10  M 18 7.5 L 24 7.5',
  },
  {
    id: 'bl',
    style: { bottom: 0, left: 0 },
    // bracket + vertical tick + horizontal tick + vertical inner
    d: 'M 17 26.5 L 1.5 26.5 L 1.5 11  M 9 26.5 L 9 22.5  M 1.5 18 L 5.5 18  M 7 17.5 L 7 23.5',
  },
  {
    id: 'br',
    style: { bottom: 0, right: 0 },
    // bracket + vertical tick + horizontal tick + diagonal inner (mirror tl)
    d: 'M 11 26.5 L 26.5 26.5 L 26.5 11  M 19 26.5 L 19 22.5  M 26.5 18 L 22.5 18  M 18 18 L 21.5 21.5',
  },
]

export default function RuneCorners({ size = 28, color = 'currentColor', opacity = 0.65, skip = [] }: Props) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
      {CORNERS.filter(c => !skip.includes(c.id)).map(c => (
        <svg
          key={c.id}
          width={size}
          height={size}
          viewBox="0 0 28 28"
          fill="none"
          stroke={color}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeOpacity={opacity}
          style={{ position: 'absolute', ...c.style }}
        >
          <path d={c.d} />
        </svg>
      ))}
    </div>
  )
}
