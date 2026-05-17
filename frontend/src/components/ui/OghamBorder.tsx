// Vertical Ogham-style border: a centre stem with grouped tick marks.
// Each "letter" is 1-4 ticks (through, above, or below the stem).
// Place inside a position:relative container.

const W    = 14    // SVG width
const STEM = W / 2 // x of centre stem

// Ogham letter definitions: [count, position] where position is 'r'=right, 'l'=left, 'x'=cross
const LETTERS: [number, 'r' | 'l' | 'x'][] = [
  [1, 'r'], [2, 'r'], [3, 'r'], [4, 'r'],
  [1, 'l'], [2, 'l'], [3, 'l'], [4, 'l'],
  [1, 'x'], [2, 'x'], [3, 'x'], [4, 'x'],
  [2, 'r'], [1, 'x'], [3, 'l'], [2, 'x'],
]

interface Props {
  side?:    'left' | 'right'
  color?:   string
  opacity?: number
}

export default function OghamBorder({ side = 'left', color = 'currentColor', opacity = 0.50 }: Props) {
  // Build tick groups along a repeating sequence
  const GROUP_H    = 8   // height of one tick unit
  const LETTER_GAP = 4   // gap between letters
  const TOP_PAD    = 18
  const TICK_W     = 4   // length of each tick (one side)

  const groups: JSX.Element[] = []
  let y = TOP_PAD
  let li = 0

  for (let g = 0; g < 40; g++) {
    const [count, pos] = LETTERS[li % LETTERS.length]
    for (let t = 0; t < count; t++) {
      const ty = y + t * GROUP_H
      if (pos === 'r' || pos === 'x') {
        groups.push(<line key={`${g}-r-${t}`} x1={STEM} y1={ty} x2={STEM + TICK_W} y2={ty} strokeWidth={0.9} />)
      }
      if (pos === 'l' || pos === 'x') {
        groups.push(<line key={`${g}-l-${t}`} x1={STEM - TICK_W} y1={ty} x2={STEM} y2={ty} strokeWidth={0.9} />)
      }
    }
    y += count * GROUP_H + LETTER_GAP
    li++
  }

  return (
    <svg
      width={W}
      height="100%"
      fill="none"
      stroke={color}
      strokeOpacity={opacity}
      strokeLinecap="round"
      style={{
        position: 'absolute',
        top: 0,
        [side]: 0,
        pointerEvents: 'none',
        zIndex: 3,
      }}
    >
      {/* centre stem */}
      <line x1={STEM} y1={0} x2={STEM} y2="100%" strokeWidth={0.6} strokeOpacity={opacity * 0.6} />
      {groups}
    </svg>
  )
}
