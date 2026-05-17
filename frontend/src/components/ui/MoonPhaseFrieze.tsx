// Horizontal strip of repeating waxing→full→waning moon phases.
// Uses SVG <pattern> so it tiles perfectly at any container width.

const R   = 5      // moon radius
const SP  = 24     // spacing between moon centres
const H   = 22     // total strip height
const CY  = H / 2  // vertical centre

const PHASES = [0.12, 0.25, 0.38, 0.50, 0.62, 0.75, 0.88]
const SEP    = 18  // extra gap after each cycle before ✦ marker
const CYCLE_W = PHASES.length * SP + SEP   // one pattern tile width

function moonPath(p: number): string {
  if (p >= 0.98) return `M 0 ${-R} A ${R} ${R} 0 0 1 0 ${R} A ${R} ${R} 0 0 1 0 ${-R}`

  const isWaxing  = p <= 0.5
  const isCrescent = isWaxing ? p < 0.25 : p > 0.75
  const rx = (R * Math.abs(Math.cos(p * Math.PI * 2))).toFixed(2)

  return isWaxing
    // right limb CW, terminator CCW (crescent) or CW (gibbous)
    ? `M 0 ${-R} A ${R} ${R} 0 0 1 0 ${R} A ${rx} ${R} 0 0 ${isCrescent ? 0 : 1} 0 ${-R}`
    // left limb CCW, terminator mirror
    : `M 0 ${-R} A ${R} ${R} 0 0 0 0 ${R} A ${rx} ${R} 0 0 ${isCrescent ? 1 : 0} 0 ${-R}`
}

interface Props {
  height?:  number
  color?:   string
  opacity?: number
}

export default function MoonPhaseFrieze({ height = H, color = 'currentColor', opacity = 0.72 }: Props) {
  const scale = height / H
  const tw    = CYCLE_W * scale
  const cy    = height / 2

  return (
    <svg width="100%" height={height} style={{ display: 'block', overflow: 'hidden' }}>
      <defs>
        <pattern id="moon-frieze-tile" x="0" y="0" width={tw} height={height} patternUnits="userSpaceOnUse">
          <g transform={`scale(${scale})`} fill={color} stroke={color} opacity={opacity}>
            {/* thin centre line */}
            <line x1={0} y1={CY} x2={CYCLE_W} y2={CY} strokeWidth={0.4} strokeOpacity={0.35} />
            {PHASES.map((p, i) => {
              const cx = SP / 2 + i * SP
              return (
                <g key={i} transform={`translate(${cx},${CY})`}>
                  <circle r={R} fill="none" strokeWidth={0.5} strokeOpacity={0.30} />
                  <path d={moonPath(p)} strokeWidth={0} fillOpacity={0.80} />
                </g>
              )
            })}
            {/* ✦ separator at end of cycle */}
            <text
              x={PHASES.length * SP + SEP / 2}
              y={CY}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="serif"
              fontSize={7}
              fill={color}
              fillOpacity={0.50}
              stroke="none"
            >✦</text>
          </g>
        </pattern>
      </defs>

      {/* centre line at native height */}
      <line x1={0} y1={cy} x2="100%" y2={cy} stroke={color} strokeWidth={0.4} strokeOpacity={0.20 * opacity} />
      <rect width="100%" height={height} fill="url(#moon-frieze-tile)" />
    </svg>
  )
}
