import { useState, useEffect } from 'react'

export default function PocketWatch({ size = 88 }: { size?: number }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const h = now.getHours() % 12
  const m = now.getMinutes()
  const s = now.getSeconds()

  // Face center in the 100×114 viewBox
  const cx = 50, cy = 64

  const toXY = (deg: number, r: number): [number, number] => {
    const a = (deg - 90) * Math.PI / 180
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }

  const hourDeg   = h * 30 + m * 0.5
  const minuteDeg = m * 6
  const secondDeg = s * 6

  const [hx, hy]   = toXY(hourDeg, 19)
  const [mx, my]   = toXY(minuteDeg, 27)
  const [sx, sy]   = toXY(secondDeg, 30)
  const [sbx, sby] = toXY(secondDeg + 180, 8)

  const CARDINALS = [
    { deg: 0,   label: 'XII' },
    { deg: 90,  label: 'III' },
    { deg: 180, label: 'VI'  },
    { deg: 270, label: 'IX'  },
  ]

  return (
    <svg width={size} height={size * 1.14} viewBox="0 0 100 114"
      fill="none" strokeLinecap="round">

      {/* ── Crown ── */}
      <rect x="43" y="2" width="14" height="9" rx="2.5"
        stroke="var(--gold-dim)" strokeWidth="0.9"
        style={{ fill: 'var(--bg-elevated)' }}/>
      <line x1="46" y1="11" x2="54" y2="11"
        stroke="var(--gold-dim)" strokeWidth="0.7"/>
      <rect x="46" y="11" width="8" height="5" rx="1"
        stroke="var(--gold-dim)" strokeWidth="0.7"
        style={{ fill: 'var(--bg-elevated)' }}/>

      {/* ── Outer case ── */}
      <circle cx={cx} cy={cy} r="45"
        stroke="var(--gold)" strokeWidth="2"
        style={{ fill: 'var(--bg-panel)' }}/>

      {/* ── Bezel ticks (60 positions) ── */}
      {Array.from({ length: 60 }, (_, i) => {
        const isHour = i % 5 === 0
        const [x1, y1] = toXY(i * 6, isHour ? 39.5 : 41.5)
        const [x2, y2] = toXY(i * 6, 44.5)
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="var(--gold)"
            strokeWidth={isHour ? 1.1 : 0.5}
            strokeOpacity={isHour ? 0.75 : 0.40}/>
        )
      })}

      {/* ── Inner bezel ring ── */}
      <circle cx={cx} cy={cy} r="39"
        stroke="var(--gold-dim)" strokeWidth="0.5" strokeOpacity="0.35"/>

      {/* ── Face ── */}
      <circle cx={cx} cy={cy} r="38"
        style={{ fill: 'var(--bg-card)' }}/>

      {/* ── Subtle engrave rings ── */}
      <circle cx={cx} cy={cy} r="38"
        stroke="var(--gold-dim)" strokeWidth="0.4" strokeOpacity="0.25"/>
      <circle cx={cx} cy={cy} r="34.5"
        stroke="var(--gold-dim)" strokeWidth="0.3" strokeOpacity="0.15"/>

      {/* ── Cardinal Roman numerals ── */}
      {CARDINALS.map(({ deg, label }) => {
        const [x, y] = toXY(deg, 29)
        return (
          <text key={deg} x={x} y={y}
            textAnchor="middle" dominantBaseline="middle"
            style={{ fontFamily: 'Cinzel, serif', fontSize: '5.8px',
              fill: 'var(--ink-dim)', fillOpacity: 0.65 }}>
            {label}
          </text>
        )
      })}

      {/* ── Hour dots at non-cardinal positions ── */}
      {[30, 60, 120, 150, 210, 240, 300, 330].map(deg => {
        const [x, y] = toXY(deg, 33)
        return (
          <circle key={deg} cx={x} cy={y} r="1.3"
            style={{ fill: 'var(--gold-dim)' }} fillOpacity="0.45"/>
        )
      })}

      {/* ── Hour hand ── */}
      <line x1={cx} y1={cy} x2={hx} y2={hy}
        stroke="var(--ink)" strokeWidth="2.8" strokeOpacity="0.80"/>

      {/* ── Minute hand ── */}
      <line x1={cx} y1={cy} x2={mx} y2={my}
        stroke="var(--ink)" strokeWidth="1.6" strokeOpacity="0.70"/>

      {/* ── Second hand (gold, with back tail) ── */}
      <line x1={sbx} y1={sby} x2={sx} y2={sy}
        stroke="var(--gold)" strokeWidth="0.8" strokeOpacity="0.85"/>

      {/* ── Center cap ── */}
      <circle cx={cx} cy={cy} r="2.8" style={{ fill: 'var(--gold)' }}/>
      <circle cx={cx} cy={cy} r="1.1" style={{ fill: 'var(--bg-card)' }}/>

    </svg>
  )
}
