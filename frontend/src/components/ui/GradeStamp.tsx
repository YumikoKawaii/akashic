// A nostalgic rubber-stamp grade mark — the kind examiners pressed onto old
// papers and library cards: double ring, curved lettering around the rim, a
// big letter in the centre, and distressed ink that skips where the stamp
// didn't press evenly. Flat ink on paper (multiply blend), slightly rotated.

let uid = 0

interface Props {
  letter: string
  color?: string
  size?: number
}

export default function GradeStamp({ letter, color = '#8b1a1a', size = 104 }: Props) {
  const id = `stamp-${uid++}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: 'block', transform: 'rotate(-8deg)', mixBlendMode: 'multiply', opacity: 0.92 }}
    >
      <defs>
        {/* Worn-ink filter: a gentle warp so the rings aren't machine-perfect,
            then noise-driven erosion so the ink skips like a real stamp pad. */}
        <filter id={id} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="5" result="speck" />
          {/* alpha = 1 − (R+G+B): mostly transparent, with soft specks where the noise is dark */}
          <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1 -1 -1 0 1" result="speckA" />
          <feComposite in="rough" in2="speckA" operator="out" />
        </filter>
        {/* Rim text paths: over the top, and under the bottom (left→right so it reads upright). */}
        <path id={`${id}-arc-t`} d="M 14,50 A 36,36 0 0 1 86,50" fill="none" />
        <path id={`${id}-arc-b`} d="M 12,50 A 38,38 0 0 0 88,50" fill="none" />
      </defs>

      <g filter={`url(#${id})`}>
        <g fill="none" stroke={color}>
          <circle cx="50" cy="50" r="47" strokeWidth="2.6" />
          <circle cx="50" cy="50" r="43" strokeWidth="0.9" />
          <circle cx="50" cy="50" r="27" strokeWidth="1.1" />
        </g>

        {/* Side diamonds between the two runs of rim text */}
        <g fill={color} stroke="none">
          <polygon points="8.6,50 11.2,47.6 13.8,50 11.2,52.4" />
          <polygon points="86.2,50 88.8,47.6 91.4,50 88.8,52.4" />
        </g>

        <text fontFamily="Cinzel, serif" fontSize="6.8" fontWeight={700} letterSpacing="1.4" fill={color}>
          <textPath href={`#${id}-arc-t`} startOffset="50%" textAnchor="middle">AKASHIC · ARCHIVE</textPath>
        </text>
        <text fontFamily="Cinzel, serif" fontSize="6.8" fontWeight={700} letterSpacing="2.6" fill={color}>
          <textPath href={`#${id}-arc-b`} startOffset="50%" textAnchor="middle">FINAL GRADE</textPath>
        </text>

        <text
          x={50}
          y={51.5}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Cinzel, serif"
          fontSize={32}
          fontWeight={700}
          fill={color}
        >
          {letter}
        </text>
      </g>
    </svg>
  )
}
