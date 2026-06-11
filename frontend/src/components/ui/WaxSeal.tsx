// A pressed wax seal: irregular dripped rim, embossed face, stamped inner ring,
// and a Cinzel letter in the centre. Tinted via `color` (defaults to sealing red).

let uid = 0

interface Props {
  letter: string
  color?: string
  size?: number
}

// Rim bumps — fixed angles/radii so the blob edge looks hand-pressed, not random per render.
const BUMPS: [number, number, number][] = [
  // [angle°, distance from centre, bump radius]
  [8, 41, 4.5], [52, 42, 3.5], [95, 40.5, 5], [138, 42, 3],
  [171, 41, 4], [205, 42.5, 3.5], [243, 40.5, 5.5], [288, 42, 3], [328, 41, 4.5],
]

export default function WaxSeal({ letter, color = '#8b1a1a', size = 84 }: Props) {
  const id = `wax-${uid++}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: 'block', transform: 'rotate(-6deg)', filter: 'drop-shadow(0 3px 8px rgba(30,21,8,0.30))' }}
    >
      <defs>
        <radialGradient id={id} cx="38%" cy="32%" r="75%">
          <stop offset="0%"  stopColor="#fff" stopOpacity="0.40" />
          <stop offset="35%" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="80%" stopColor="#000" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.28" />
        </radialGradient>
      </defs>

      {/* wax body: core disc + dripped rim bumps */}
      <g fill={color}>
        <circle cx={50} cy={50} r={40} />
        {BUMPS.map(([deg, d, r], i) => {
          const a = (deg * Math.PI) / 180
          return <circle key={i} cx={50 + d * Math.cos(a)} cy={50 + d * Math.sin(a)} r={r} />
        })}
      </g>
      {/* embossed light over the same silhouette */}
      <g fill={`url(#${id})`}>
        <circle cx={50} cy={50} r={40} />
        {BUMPS.map(([deg, d, r], i) => {
          const a = (deg * Math.PI) / 180
          return <circle key={i} cx={50 + d * Math.cos(a)} cy={50 + d * Math.sin(a)} r={r} />
        })}
      </g>

      {/* stamped depression: dark groove + dotted ceremonial ring */}
      <circle cx={50} cy={50} r={33} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth={2.5} />
      <circle cx={50} cy={50} r={33} fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth={0.8} />
      <circle cx={50} cy={50} r={28.5} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={0.7} strokeDasharray="1.6 3.2" />

      <text
        x={50}
        y={51}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Cinzel, serif"
        fontSize={30}
        fontWeight={700}
        fill="rgba(255,248,235,0.88)"
        style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.45))' }}
      >
        {letter}
      </text>
    </svg>
  )
}
