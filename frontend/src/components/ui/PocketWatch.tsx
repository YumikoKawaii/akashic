import { useState, useEffect } from 'react'

// All geometry relative to center (50, 50) in a 100×100 viewBox
const cx = 50, cy = 50

function toXY(deg: number, r: number): [number, number] {
  const a = (deg - 90) * Math.PI / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

// Perpendicular offset from a radial point — used to build diamond shapes
function perp(deg: number, r: number, off: number): [number, number] {
  const a = (deg - 90) * Math.PI / 180
  return [cx + r * Math.cos(a) + off * (-Math.sin(a)),
          cy + r * Math.sin(a) + off * Math.cos(a)]
}

// Elongated diamond spire along radial axis
function spire(deg: number, tipR: number, baseR: number, hw: number): string {
  const [tx, ty] = toXY(deg, tipR)
  const [bx, by] = toXY(deg, baseR)
  const midR = baseR + (tipR - baseR) * 0.38
  const [lx, ly] = perp(deg, midR, -hw)
  const [rx, ry] = perp(deg, midR,  hw)
  return `M${tx},${ty}L${lx},${ly}L${bx},${by}L${rx},${ry}Z`
}

// Kite/leaf hand — wide near base, tapering to pointed tip
function hand(deg: number, tipR: number, hw: number, backR = 3): string {
  const [tx, ty] = toXY(deg, tipR)
  const [bx, by] = toXY(deg + 180, backR)
  const wideR = tipR * 0.28
  const [lx, ly] = perp(deg, wideR, -hw)
  const [rx, ry] = perp(deg, wideR,  hw)
  return `M${bx},${by}L${lx},${ly}L${tx},${ty}L${rx},${ry}Z`
}

export default function PocketWatch({ size = 88 }: { size?: number }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const h = now.getHours() % 12
  const m = now.getMinutes()
  const s = now.getSeconds()

  const hourDeg   = h * 30 + m * 0.5
  const minuteDeg = m * 6
  const secondDeg = s * 6

  const [sx,  sy]  = toXY(secondDeg, 33)
  const [sbx, sby] = toXY(secondDeg + 180, 8)

  const CARDINALS = [
    { deg: 0,   label: 'XII' },
    { deg: 90,  label: 'III' },
    { deg: 180, label: 'VI'  },
    { deg: 270, label: 'IX'  },
  ]

  return (
    <svg width={size} height={size} viewBox="-2 -2 104 104"
      fill="none" strokeLinecap="round">

      {/* ── Outer star crown: 12 pointed spires ── */}
      {Array.from({ length: 12 }, (_, i) => {
        const deg = i * 30
        const isCard = i % 3 === 0
        return (
          <path key={i}
            d={spire(deg, isCard ? 50 : 46, 42, isCard ? 2.8 : 1.6)}
            stroke="var(--gold)" strokeWidth={isCard ? 0.6 : 0.4}
            strokeOpacity={isCard ? 0.75 : 0.45}/>
        )
      })}

      {/* ── Outer ring ── */}
      <circle cx={cx} cy={cy} r="42"
        stroke="var(--gold)" strokeWidth="0.9" strokeOpacity="0.60"/>

      {/* ── 60-division bezel ticks ── */}
      {Array.from({ length: 60 }, (_, i) => {
        const isHour = i % 5 === 0
        const isCard = i % 15 === 0
        const [x1, y1] = toXY(i * 6, isCard ? 37.5 : isHour ? 38.8 : 40)
        const [x2, y2] = toXY(i * 6, 42)
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="var(--gold)"
            strokeWidth={isCard ? 1 : isHour ? 0.7 : 0.35}
            strokeOpacity={isCard ? 0.75 : isHour ? 0.55 : 0.30}/>
        )
      })}

      {/* ── Secondary inner ring ── */}
      <circle cx={cx} cy={cy} r="37"
        stroke="var(--gold-dim)" strokeWidth="0.5" strokeOpacity="0.30"/>

      {/* ── Decorative connecting arcs between cardinal medallions ── */}
      {[0, 90, 180, 270].map(deg => {
        const [x1, y1] = toXY(deg + 45, 37)
        const [qx, qy] = toXY(deg + 45, 31)
        const [x2, y2] = toXY(deg + 90, 37)
        return (
          <path key={deg} d={`M${x1},${y1}Q${qx},${qy}${x2},${y2}`}
            stroke="var(--gold-dim)" strokeWidth="0.55" strokeOpacity="0.38"/>
        )
      })}

      {/* ── Face fill ── */}
      <circle cx={cx} cy={cy} r="36.5"
        style={{ fill: 'var(--bg-card)' }}/>

      {/* ── Subtle face inner ring ── */}
      <circle cx={cx} cy={cy} r="36.5"
        stroke="var(--gold-dim)" strokeWidth="0.35" strokeOpacity="0.20"/>

      {/* ── Cardinal medallions (double ring + Roman numeral) ── */}
      {CARDINALS.map(({ deg, label }) => {
        const [mx, my] = toXY(deg, 27)
        return (
          <g key={deg}>
            <circle cx={mx} cy={my} r="8"
              stroke="var(--gold)" strokeWidth="0.65" strokeOpacity="0.55"
              style={{ fill: 'var(--bg-panel)' }}/>
            <circle cx={mx} cy={my} r="5.8"
              stroke="var(--gold-dim)" strokeWidth="0.35" strokeOpacity="0.30"/>
            <text x={mx} y={my} textAnchor="middle" dominantBaseline="middle"
              style={{ fontFamily: 'Cinzel, serif', fontSize: '5.2px',
                       fill: 'var(--ink-dim)', fillOpacity: 0.72 }}>
              {label}
            </text>
          </g>
        )
      })}

      {/* ── Minor hour markers (small spire diamonds) ── */}
      {[30, 60, 120, 150, 210, 240, 300, 330].map(deg => (
        <path key={deg} d={spire(deg, 33.5, 30.5, 1)}
          stroke="var(--gold)" strokeWidth="0.4" strokeOpacity="0.45"/>
      ))}

      {/* ── Inner ornament ring ── */}
      <circle cx={cx} cy={cy} r="20"
        stroke="var(--gold-dim)" strokeWidth="0.4" strokeOpacity="0.25"/>

      {/* ── Center rosette: 6 overlapping petals ── */}
      {Array.from({ length: 6 }, (_, i) => {
        const [px, py] = toXY(i * 60, 7.5)
        return (
          <circle key={i} cx={px} cy={py} r="5.5"
            stroke="var(--gold-dim)" strokeWidth="0.45" strokeOpacity="0.35"/>
        )
      })}
      <circle cx={cx} cy={cy} r="7"
        stroke="var(--gold-dim)" strokeWidth="0.45" strokeOpacity="0.30"/>

      {/* ── Hour hand (wide leaf, gold fill) ── */}
      <path d={hand(hourDeg, 21, 2.6, 3.5)}
        style={{ fill: 'var(--gold)' }} fillOpacity="0.70"
        stroke="var(--gold)" strokeWidth="0.3" strokeOpacity="0.5"/>

      {/* ── Minute hand (slender leaf, dimmer) ── */}
      <path d={hand(minuteDeg, 30, 1.7, 3.5)}
        style={{ fill: 'var(--gold-dim)' }} fillOpacity="0.60"
        stroke="var(--gold-dim)" strokeWidth="0.3" strokeOpacity="0.4"/>

      {/* ── Second hand (thin line with back tail) ── */}
      <line x1={sbx} y1={sby} x2={sx} y2={sy}
        stroke="var(--gold)" strokeWidth="0.55" strokeOpacity="0.50"/>

      {/* ── Center hub ── */}
      <circle cx={cx} cy={cy} r="3.2"
        style={{ fill: 'var(--gold)' }} fillOpacity="0.85"
        stroke="var(--gold)" strokeWidth="0.3"/>
      <circle cx={cx} cy={cy} r="1.4"
        style={{ fill: 'var(--bg-card)' }}/>

    </svg>
  )
}
