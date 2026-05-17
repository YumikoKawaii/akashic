// Horizontal astrolabe-style band: two ruled lines with graded tick marks,
// diamond ornaments at cardinal points, and alchemical glyphs.
// Stretches to 100% width via viewBox scaling.

const VW   = 1000   // viewBox width
const VH   = 38     // viewBox height
const TOP  = 6      // top rail y
const BOT  = VH - 6 // bottom rail y
const BAND = BOT - TOP

const CARDINALS   = [0, 250, 500, 750, 1000]
const GLYPHS      = ['☉', '☽', '☿', '♄', '♃']
const TICK_COUNT  = 100  // total ticks across the band

function diamond(x: number, y: number, s = 3.5) {
  return `M ${x} ${y - s} L ${x + s} ${y} L ${x} ${y + s} L ${x - s} ${y} Z`
}

interface Props {
  color?:   string
  opacity?: number
}

export default function AstrolabeBand({ color = 'currentColor', opacity = 0.70 }: Props) {
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => {
    const x       = (i / TICK_COUNT) * VW
    const isCard  = i % 25 === 0   // every 25 = cardinal
    const isMajor = i % 10 === 0   // every 10 = major
    const isMid   = i % 5  === 0   // every 5  = mid
    const h = isCard ? BAND : isMajor ? BAND * 0.55 : isMid ? BAND * 0.35 : BAND * 0.18
    return { x, h, isCard, isMajor }
  })

  return (
    <svg
      width="100%"
      height={VH}
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="none"
      fill={color}
      stroke={color}
      strokeLinecap="round"
      opacity={opacity}
      style={{ display: 'block' }}
    >
      {/* top and bottom rails */}
      <line x1={0} y1={TOP}  x2={VW} y2={TOP}  strokeWidth={0.8} strokeOpacity={0.60} />
      <line x1={0} y1={BOT}  x2={VW} y2={BOT}  strokeWidth={0.8} strokeOpacity={0.60} />

      {/* faint inner rails */}
      <line x1={0} y1={TOP + 4}  x2={VW} y2={TOP + 4}  strokeWidth={0.3} strokeOpacity={0.22} />
      <line x1={0} y1={BOT - 4}  x2={VW} y2={BOT - 4}  strokeWidth={0.3} strokeOpacity={0.22} />

      {/* tick marks (descend from top rail) */}
      {ticks.map(({ x, h }) => (
        <line key={x} x1={x} y1={TOP} x2={x} y2={TOP + h} strokeWidth={0.6} strokeOpacity={0.55} />
      ))}

      {/* cardinal: diamond + glyph below */}
      {CARDINALS.map((x, i) => (
        <g key={x}>
          <path d={diamond(x, TOP - 2)} fill={color} fillOpacity={0.65} stroke="none" />
          <path d={diamond(x, BOT + 2)} fill={color} fillOpacity={0.65} stroke="none" />
          <text
            x={x}
            y={(TOP + BOT) / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Cinzel, serif"
            fontSize={9}
            fill={color}
            fillOpacity={0.55}
            stroke="none"
          >
            {GLYPHS[i % GLYPHS.length]}
          </text>
        </g>
      ))}
    </svg>
  )
}
