import React from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function px(r: number, deg: number) { return r * Math.cos((deg * Math.PI) / 180) }
function py(r: number, deg: number) { return r * Math.sin((deg * Math.PI) / 180) }

function spin(baseDur: number, dir: 'cw' | 'ccw' = 'cw', speed = 1): React.CSSProperties {
  return {
    animation: `mc-${dir} ${(baseDur / speed).toFixed(1)}s linear infinite`,
    transformBox: 'fill-box',
    transformOrigin: 'center',
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

type Variant = 'full' | 'outer' | 'inner' | 'halo' | 'sigil' | 'orbit' | 'spark'

export default function MagicCircle({ style, className, variant = 'full', speed = 1 }: {
  style?: React.CSSProperties
  className?: string
  variant?: Variant
  speed?: number
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

        {/* ── outer / full: big outer rings ── */}
        {(variant === 'full' || variant === 'outer') && <>
          <g style={spin(90, 'cw', speed)}>
            <circle r={ro} strokeWidth="0.8" />
            {ticks}
            {diamonds}
          </g>
          <circle r={rd} strokeWidth="0.5" strokeDasharray="3 7" style={spin(70, 'ccw', speed)} />
          <g style={spin(50, 'cw', speed)}>
            <polygon points={`${sq},${sq} ${-sq},${sq} ${-sq},${-sq} ${sq},${-sq}`} strokeWidth="0.7" />
            <polygon points={`${rg},0 0,${rg} ${-rg},0 0,${-rg}`} strokeWidth="0.7" />
          </g>
        </>}

        {/* ── full: middle layer ── */}
        {variant === 'full' && <>
          <circle r={rm} strokeWidth="0.8" strokeOpacity="0.5" />
          {midDots}
        </>}

        {/* ── full / inner: inner geometry ── */}
        {(variant === 'full' || variant === 'inner') && <>
          <circle r={rm} strokeWidth="0.8" strokeOpacity={variant === 'inner' ? 0.75 : 0.5} />
          {variant === 'inner' && midDots}
          <g style={spin(38, 'ccw', speed)}>
            <polygon points={hexUp}   strokeWidth="0.7" />
            <polygon points={hexDown} strokeWidth="0.7" />
          </g>
          <circle r={ri} strokeWidth="0.7" strokeOpacity="0.5" />
          <circle r={9}  strokeWidth="0.5" strokeOpacity="0.4" />
          <circle r={4}  fill="currentColor" fillOpacity="0.3" stroke="none" />
        </>}

        {/* ── halo: outer ring + ticks only ── */}
        {variant === 'halo' && <>
          <g style={spin(90, 'cw', speed)}>
            <circle r={ro} strokeWidth="0.8" />
            {ticks}
            {diamonds}
          </g>
          <circle r={rd} strokeWidth="0.4" strokeDasharray="2 10" style={spin(60, 'ccw', speed)} />
        </>}

        {/* ── sigil: hexagram + center, no outer rings ── */}
        {variant === 'sigil' && <>
          <g style={spin(28, 'ccw', speed)}>
            <polygon points={hexUp}   strokeWidth="0.8" />
            <polygon points={hexDown} strokeWidth="0.8" />
          </g>
          <circle r={ri} strokeWidth="0.6" strokeOpacity="0.6" />
          <circle r={9}  strokeWidth="0.4" strokeOpacity="0.35" />
          <circle r={4}  fill="currentColor" fillOpacity="0.35" stroke="none" />
        </>}

        {/* ── orbit: dashed outer ring + orbiting dots ── */}
        {variant === 'orbit' && <>
          <circle r={rd} strokeWidth="0.5" strokeDasharray="2 9" style={spin(55, 'ccw', speed)} />
          <circle r={rm} strokeWidth="0.4" strokeOpacity="0.35" />
          <g style={spin(35, 'cw', speed)}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
              <circle key={deg} cx={px(rm, deg)} cy={py(rm, deg)} r={2.8}
                fill="currentColor" fillOpacity="0.6" stroke="none" />
            ))}
          </g>
          <circle r={9}  strokeWidth="0.4" strokeOpacity="0.35" />
          <circle r={4}  fill="currentColor" fillOpacity="0.3" stroke="none" />
        </>}

        {/* ── spark: octagram + dashed ring, angular ── */}
        {variant === 'spark' && <>
          <circle r={rd} strokeWidth="0.5" strokeDasharray="3 6" style={spin(65, 'ccw', speed)} />
          <g style={spin(40, 'cw', speed)}>
            <polygon points={`${sq},${sq} ${-sq},${sq} ${-sq},${-sq} ${sq},${-sq}`} strokeWidth="0.8" />
            <polygon points={`${rg},0 0,${rg} ${-rg},0 0,${-rg}`} strokeWidth="0.8" />
          </g>
          <circle r={ri} strokeWidth="0.5" strokeOpacity="0.4" />
          <circle r={4}  fill="currentColor" fillOpacity="0.25" stroke="none" />
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

export function MagicCircleBackground({ leftOffset = 0 }: { leftOffset?: number }) {
  return (
    <div style={{
      position: 'fixed', top: 0, bottom: 0, right: 0, left: leftOffset,
      zIndex: 0, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: '72vmin', height: '72vmin', opacity: 0.065, color: 'var(--gold)' }}>
        <MagicCircle />
      </div>
    </div>
  )
}
