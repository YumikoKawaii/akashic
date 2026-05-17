import React from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function px(r: number, deg: number) { return r * Math.cos((deg * Math.PI) / 180) }
function py(r: number, deg: number) { return r * Math.sin((deg * Math.PI) / 180) }

function spin(dur: string, dir: 'cw' | 'ccw' = 'cw'): React.CSSProperties {
  return {
    animation: `mc-${dir} ${dur} linear infinite`,
    transformBox: 'fill-box',
    transformOrigin: 'center',
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

type Variant = 'full' | 'outer' | 'inner'

export default function MagicCircle({ style, className, variant = 'full' }: {
  style?: React.CSSProperties
  className?: string
  variant?: Variant
}) {
  const ro = 90   // outer ring
  const rd = 78   // dashed ring
  const rg = 58   // octagram
  const sq = rg / Math.SQRT2  // ≈ 41.0
  const rm = 48   // middle ring
  const rh = 34   // hexagram
  const ri = 22   // inner ring

  const ticks = Array.from({ length: 24 }, (_, i) => {
    const deg = i * 15
    const isCard = i % 6 === 0
    const isSec  = i % 3 === 0 && !isCard
    const r0 = isCard ? ro - 10 : isSec ? ro - 6 : ro - 3
    return (
      <line
        key={i}
        x1={px(r0, deg)} y1={py(r0, deg)}
        x2={px(ro, deg)} y2={py(ro, deg)}
        strokeWidth={isCard ? 1.4 : 0.6}
      />
    )
  })

  const diamonds = [0, 90, 180, 270].map(deg => {
    const a = (deg * Math.PI) / 180
    const ca = Math.cos(a), sa = Math.sin(a)
    const na = -sa, nb = ca
    const cx = (ro + 4) * ca, cy = (ro + 4) * sa
    const s = 3.5
    const pts = [
      [cx + ca * s, cy + sa * s],
      [cx + na * s, cy + nb * s],
      [cx - ca * s, cy - sa * s],
      [cx - na * s, cy - nb * s],
    ].map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
    return <polygon key={deg} points={pts} fill="currentColor" fillOpacity="0.5" stroke="none" />
  })

  const midDots = [0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
    <circle key={deg} cx={px(rm, deg)} cy={py(rm, deg)} r={1.8}
      fill="currentColor" fillOpacity="0.45" stroke="none" />
  ))

  const hexUp  = [[-90, rh], [30, rh], [150, rh]].map(([d, r]) => `${px(r,d).toFixed(2)},${py(r,d).toFixed(2)}`).join(' ')
  const hexDown = [[90, rh], [210, rh], [330, rh]].map(([d, r]) => `${px(r,d).toFixed(2)},${py(r,d).toFixed(2)}`).join(' ')

  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      style={style}
      className={className}
    >
      <g transform="translate(100,100)" strokeOpacity="0.75">

        {/* ── outer variant: big rings ── */}
        {variant !== 'inner' && <>
          <g style={spin('90s')}>
            <circle r={ro} strokeWidth="0.8" />
            {ticks}
            {diamonds}
          </g>
          <circle r={rd} strokeWidth="0.5" strokeDasharray="3 7" style={spin('70s', 'ccw')} />
          <g style={spin('50s')}>
            <polygon points={`${sq},${sq} ${-sq},${sq} ${-sq},${-sq} ${sq},${-sq}`} strokeWidth="0.7" />
            <polygon points={`${rg},0 0,${rg} ${-rg},0 0,${-rg}`} strokeWidth="0.7" />
          </g>
        </>}

        {/* ── full variant: middle layer ── */}
        {variant === 'full' && <>
          <circle r={rm} strokeWidth="0.8" strokeOpacity="0.5" />
          {midDots}
        </>}

        {/* ── inner variant: tight geometry ── */}
        {variant !== 'outer' && <>
          <circle r={rm} strokeWidth="0.8" strokeOpacity={variant === 'inner' ? 0.75 : 0.5} />
          {variant === 'inner' && midDots}
          <g style={spin('38s', 'ccw')}>
            <polygon points={hexUp}   strokeWidth="0.7" />
            <polygon points={hexDown} strokeWidth="0.7" />
          </g>
          <circle r={ri} strokeWidth="0.7" strokeOpacity="0.5" />
          <circle r={9}  strokeWidth="0.5" strokeOpacity="0.4" />
          <circle r={4}  fill="currentColor" fillOpacity="0.3" stroke="none" />
        </>}

      </g>
    </svg>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ size = 80 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, color: 'var(--gold-dim)', flexShrink: 0 }}>
      <MagicCircle />
    </div>
  )
}

// ── Background ────────────────────────────────────────────────────────────────

export function MagicCircleBackground() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      zIndex: 0, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: '72vmin', height: '72vmin', opacity: 0.065, color: 'var(--gold)' }}>
        <MagicCircle />
      </div>
    </div>
  )
}
