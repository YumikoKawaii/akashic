import React from 'react'

// Polar helpers
const px = (r: number, deg: number) => r * Math.cos((deg * Math.PI) / 180)
const py = (r: number, deg: number) => r * Math.sin((deg * Math.PI) / 180)

function spin(dur: number, dir: 'cw' | 'ccw' = 'cw'): React.CSSProperties {
  return { animation: `mc-${dir} ${dur}s linear infinite`, transformBox: 'fill-box', transformOrigin: 'center' }
}

// ── Center Sun — concentric rings + octagram + hexagram ───────────
function CenterSun() {
  const sq = 65 / Math.SQRT2
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const deg = i * 30; const maj = i % 3 === 0
    return <line key={i} x1={px(maj ? 78 : 83, deg)} y1={py(maj ? 78 : 83, deg)} x2={px(90, deg)} y2={py(90, deg)} strokeWidth={maj ? 1.2 : 0.6} />
  })
  const hex = (r: number, off: number) =>
    [0, 60, 120].map(d => `${px(r, d + off).toFixed(1)},${py(r, d + off).toFixed(1)}`).join(' ')

  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" fill="none" stroke="currentColor" strokeLinecap="round">
      <g transform="translate(100,100)" strokeOpacity="0.88">
        <g style={spin(80, 'cw')}><circle r={90} strokeWidth="1.1" />{ticks}</g>
        <circle r={80} strokeWidth="0.6" strokeDasharray="4 6" style={spin(60, 'ccw')} />
        <g style={spin(45, 'cw')}>
          <polygon points={`${sq},${sq} ${-sq},${sq} ${-sq},${-sq} ${sq},${-sq}`} strokeWidth="1.0" />
          <polygon points={`65,0 0,65 -65,0 0,-65`} strokeWidth="1.0" />
        </g>
        <g style={spin(32, 'ccw')}>
          <polygon points={hex(48, -90)} strokeWidth="0.9" />
          <polygon points={hex(48,  90)} strokeWidth="0.9" />
        </g>
        <circle r={36} strokeWidth="0.8" strokeOpacity="0.6" />
        <circle r={22} strokeWidth="0.6" strokeOpacity="0.5" />
        <circle r={8}  strokeWidth="0.5" strokeOpacity="0.4" />
        <circle r={3}  fill="currentColor" fillOpacity="0.55" stroke="none" />
      </g>
    </svg>
  )
}

// ── Planet 1 — Triskelion (3 curved arms, triple spiral) ──────────
function PlanetTriskelion() {
  const arm = (angle: number) => {
    const a = (angle * Math.PI) / 180
    const c = Math.cos(a), s = Math.sin(a)
    const cp1x = (15 * c - 28 * s).toFixed(1), cp1y = (15 * s + 28 * c).toFixed(1)
    const cp2x = (58 * c - 22 * s).toFixed(1), cp2y = (58 * s + 22 * c).toFixed(1)
    const ex = (68 * c).toFixed(1), ey = (68 * s).toFixed(1)
    return `M 0 0 C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${ex} ${ey}`
  }
  const ticks6 = Array.from({ length: 6 }, (_, i) => {
    const deg = i * 60
    return <line key={i} x1={px(82, deg)} y1={py(82, deg)} x2={px(88, deg)} y2={py(88, deg)} strokeWidth="1.0" />
  })
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" fill="none" stroke="currentColor" strokeLinecap="round">
      <g transform="translate(100,100)" strokeOpacity="0.88">
        <g style={spin(70, 'cw')}><circle r={88} strokeWidth="1.1" />{ticks6}</g>
        <circle r={72} strokeWidth="0.6" strokeDasharray="3 9" style={spin(50, 'ccw')} />
        <g style={spin(28, 'cw')}>
          {[0, 120, 240].map(a => <path key={a} d={arm(a)} strokeWidth="1.3" />)}
        </g>
        <circle r={20} strokeWidth="0.8" strokeOpacity="0.6" />
        <circle r={8}  strokeWidth="0.5" strokeOpacity="0.4" />
        <circle r={3}  fill="currentColor" fillOpacity="0.5" stroke="none" />
      </g>
    </svg>
  )
}

// ── Planet 2 — Pentacle (5-pointed star + pentagon dots) ──────────
function PlanetPentacle() {
  const r = 65
  const verts = Array.from({ length: 5 }, (_, i) => [px(r, i * 72 - 90), py(r, i * 72 - 90)] as [number,number])
  const star = [0,2,4,1,3,0].map((i,j) => `${j===0?'M':'L'} ${verts[i][0].toFixed(1)} ${verts[i][1].toFixed(1)}`).join(' ') + ' Z'
  const ticks10 = Array.from({ length: 10 }, (_, i) => {
    const deg = i * 36 - 90; const maj = i % 2 === 0
    return <line key={i} x1={px(maj?80:84, deg)} y1={py(maj?80:84, deg)} x2={px(88, deg)} y2={py(88, deg)} strokeWidth={maj ? 1.0 : 0.5} />
  })
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" fill="none" stroke="currentColor" strokeLinecap="round">
      <g transform="translate(100,100)" strokeOpacity="0.88">
        <g style={spin(75, 'ccw')}><circle r={88} strokeWidth="1.1" />{ticks10}</g>
        <circle r={74} strokeWidth="0.5" strokeDasharray="2 8" style={spin(55, 'cw')} />
        <g style={spin(38, 'cw')}>
          <path d={star} strokeWidth="1.1" />
          {verts.map(([x,y],i) => <circle key={i} cx={x} cy={y} r={2.8} fill="currentColor" fillOpacity="0.65" stroke="none" />)}
        </g>
        <circle r={28} strokeWidth="0.7" strokeOpacity="0.5" />
        <circle r={4}  fill="currentColor" fillOpacity="0.45" stroke="none" />
      </g>
    </svg>
  )
}

// ── Planet 3 — Triquetra (3 interlocking circles) ─────────────────
function PlanetTriquetra() {
  const circles = [0, 120, 240].map(deg => (
    <circle key={deg} cx={px(34, deg)} cy={py(34, deg)} r={46} strokeWidth="1.0" />
  ))
  const ticks8 = Array.from({ length: 8 }, (_, i) => {
    const deg = i * 45
    return <line key={i} x1={px(83, deg)} y1={py(83, deg)} x2={px(88, deg)} y2={py(88, deg)} strokeWidth="0.8" />
  })
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" fill="none" stroke="currentColor" strokeLinecap="round">
      <g transform="translate(100,100)" strokeOpacity="0.88">
        <g style={spin(80, 'cw')}><circle r={88} strokeWidth="1.0" />{ticks8}</g>
        <g style={spin(32, 'ccw')}>{circles}</g>
        <circle r={16} strokeWidth="0.8" strokeOpacity="0.6" />
        <circle r={4}  fill="currentColor" fillOpacity="0.45" stroke="none" />
      </g>
    </svg>
  )
}

// ── Planet 4 — Compass Rose (8 spokes + arc segments) ────────────
function PlanetCompass() {
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const deg = i * 45; const maj = i % 2 === 0
    return <line key={i} x1={px(maj?38:55, deg)} y1={py(maj?38:55, deg)} x2={px(80, deg)} y2={py(80, deg)} strokeWidth={maj ? 1.1 : 0.65} />
  })
  const arcs = [0, 90, 180, 270].map(s => {
    const a1 = s + 16, a2 = s + 74
    return <path key={s} d={`M ${px(58,a1).toFixed(1)} ${py(58,a1).toFixed(1)} A 58 58 0 0 1 ${px(58,a2).toFixed(1)} ${py(58,a2).toFixed(1)}`} strokeWidth="0.8" />
  })
  const dots = Array.from({ length: 8 }, (_, i) => (
    <circle key={i} cx={px(80, i*45)} cy={py(80, i*45)} r={2.2} fill="currentColor" fillOpacity="0.65" stroke="none" />
  ))
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" fill="none" stroke="currentColor" strokeLinecap="round">
      <g transform="translate(100,100)" strokeOpacity="0.88">
        <circle r={88} strokeWidth="1.0" style={spin(88, 'ccw')} />
        <g style={spin(48, 'cw')}>{spokes}{arcs}{dots}</g>
        <circle r={32} strokeWidth="0.7" strokeOpacity="0.5" />
        <circle r={20} strokeWidth="0.5" strokeDasharray="2 5" style={spin(28, 'ccw')} />
        <circle r={4}  fill="currentColor" fillOpacity="0.45" stroke="none" />
      </g>
    </svg>
  )
}

// ── Planet 5 — Armillary Sphere (3 tilted ellipses) ───────────────
function PlanetArmillary() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" fill="none" stroke="currentColor" strokeLinecap="round">
      <g transform="translate(100,100)" strokeOpacity="0.88">
        <circle r={88} strokeWidth="1.0" style={spin(85, 'cw')} />
        {/* 3 ellipses at 0°, 60°, 120° — spin as one unit (armillary sphere) */}
        <g style={spin(55, 'cw')}>
          <ellipse rx={82} ry={26} strokeWidth="1.0" />
          <ellipse rx={82} ry={26} strokeWidth="1.0" transform="rotate(60)" />
          <ellipse rx={82} ry={26} strokeWidth="1.0" transform="rotate(120)" />
        </g>
        <circle r={18} strokeWidth="0.9" />
        <circle r={10} strokeWidth="0.6" strokeOpacity="0.5" style={spin(25, 'ccw')} />
        <circle r={4}  fill="currentColor" fillOpacity="0.45" stroke="none" />
      </g>
    </svg>
  )
}

// ── Orbit config ──────────────────────────────────────────────────

interface Planet {
  orbitR: number; size: number; period: number
  startAngle: number; dir: 'cw' | 'ccw'
  color: string; opacity: number
  Component: React.FC
}

const ORBIT_RADII = [185, 310, 450]

const PLANETS: Planet[] = [
  { orbitR: 185, size: 160, period: 22, startAngle: 50,  dir: 'cw',  color: '#5a1a8a', opacity: 0.88, Component: PlanetTriskelion },
  { orbitR: 310, size: 140, period: 38, startAngle: 140, dir: 'ccw', color: '#0a6878', opacity: 0.85, Component: PlanetPentacle   },
  { orbitR: 310, size: 135, period: 38, startAngle: 310, dir: 'ccw', color: '#8a1848', opacity: 0.85, Component: PlanetTriquetra  },
  { orbitR: 450, size: 120, period: 62, startAngle: 80,  dir: 'cw',  color: '#1a6838', opacity: 0.82, Component: PlanetCompass    },
  { orbitR: 450, size: 112, period: 62, startAngle: 250, dir: 'cw',  color: '#1a3888', opacity: 0.80, Component: PlanetArmillary  },
]

export default function SolarSystemBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>

      {ORBIT_RADII.map(r => (
        <div key={r} style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: r * 2, height: r * 2, borderRadius: '50%',
          border: '1px solid rgba(154,112,24,0.18)',
        }} />
      ))}

      {/* Center Sun */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 280, height: 280, color: '#c8900a', opacity: 0.88,
      }}>
        <CenterSun />
      </div>

      {PLANETS.map((p, i) => {
        const delay = -((p.startAngle / 360) * p.period)
        return (
          <div key={i} style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 0, height: 0,
            animation: `mc-${p.dir} ${p.period}s linear infinite`,
            animationDelay: `${delay}s`,
            transformOrigin: '0 0',
          }}>
            <div style={{
              position: 'absolute',
              left: p.orbitR - p.size / 2, top: -p.size / 2,
              width: p.size, height: p.size,
              color: p.color, opacity: p.opacity,
              animation: `mc-${p.dir === 'cw' ? 'ccw' : 'cw'} ${p.period}s linear infinite`,
              animationDelay: `${delay}s`,
              transformOrigin: 'center',
            }}>
              <p.Component />
            </div>
          </div>
        )
      })}
    </div>
  )
}
