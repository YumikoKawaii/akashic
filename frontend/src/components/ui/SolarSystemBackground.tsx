import React from 'react'

// SVG viewBox 0 0 680 680, center at (340,340).
// Stroke width guide: planet renders at ~260px → scale 260/680 = 0.38
// SW 8 → 3px rendered, SW 5 → 1.9px, SW 3 → 1.1px

const O = '340px 340px'
function anim(dur: number, dir: 'cw' | 'ccw'): React.CSSProperties {
  return { transformOrigin: O, animation: `mc-${dir} ${dur}s linear infinite` }
}

function Hexagram({ r, sw = 7, op = 1 }: { r: number; sw?: number; op?: number }) {
  const pt = (d: number) => `${r * Math.sin(d * Math.PI / 180)},${-r * Math.cos(d * Math.PI / 180)}`
  return (
    <g stroke="currentColor" fill="none" strokeWidth={sw} opacity={op} strokeLinejoin="round">
      <polygon points={`${pt(0)} ${pt(120)} ${pt(240)}`}/>
      <polygon points={`${pt(60)} ${pt(180)} ${pt(300)}`}/>
    </g>
  )
}

function Octagram({ r, sw = 7 }: { r: number; sw?: number }) {
  const h = r * 0.7071
  return (
    <g stroke="currentColor" fill="none" strokeWidth={sw} strokeLinejoin="round">
      <rect x={-h} y={-h} width={h * 2} height={h * 2}/>
      <rect x={-h} y={-h} width={h * 2} height={h * 2} transform="rotate(45)"/>
    </g>
  )
}

function Ticks({ r, n, len, sw }: { r: number; n: number; len: number; sw: number }) {
  return (
    <g stroke="currentColor" strokeWidth={sw} strokeLinecap="round">
      {Array.from({ length: n }, (_, i) => (
        <line key={i} x1={0} y1={-r} x2={0} y2={-(r - len)} transform={`rotate(${i * (360 / n)})`}/>
      ))}
    </g>
  )
}

function Medallions({ r, cr, n = 6, sw = 5 }: { r: number; cr: number; n?: number; sw?: number }) {
  return (
    <g stroke="currentColor" fill="none" strokeWidth={sw}>
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={0} cy={-r} r={cr} transform={`rotate(${i * (360 / n)})`}/>
      ))}
    </g>
  )
}

function Petals({ r, cr, n = 6, sw = 5 }: { r: number; cr: number; n?: number; sw?: number }) {
  return (
    <g stroke="currentColor" fill="none" strokeWidth={sw}>
      {Array.from({ length: n }, (_, i) => {
        const a = i * (360 / n) * Math.PI / 180
        return <circle key={i} cx={r * Math.sin(a)} cy={-r * Math.cos(a)} r={cr}/>
      })}
    </g>
  )
}

// ── Center Sun (gold, large) ─────────────────────────────────────────
function CenterSun() {
  return (
    <svg viewBox="0 0 680 680" width="100%" height="100%" fill="none" stroke="currentColor" strokeLinecap="round">
      <g style={anim(60, 'cw')} transform="translate(340,340)">
        <circle r={310} strokeWidth={6}/>
        <circle r={298} strokeWidth={2.5}/>
        <Ticks r={310} n={6} len={32} sw={5}/>
        <Ticks r={310} n={24} len={16} sw={3}/>
      </g>
      <g style={anim(40, 'ccw')} transform="translate(340,340)">
        <circle r={276} strokeWidth={6}/>
        <circle r={262} strokeWidth={2.5}/>
        <Ticks r={276} n={12} len={14} sw={4}/>
        <Ticks r={262} n={12} len={10} sw={3}/>
      </g>
      <g style={anim(30, 'cw')} transform="translate(340,340)">
        <circle r={244} strokeWidth={5}/>
        <Medallions r={238} cr={16} n={6} sw={4}/>
        <circle r={220} strokeWidth={2.5}/>
      </g>
      <g style={anim(20, 'ccw')} transform="translate(340,340)">
        <circle r={208} strokeWidth={5}/>
        <Hexagram r={192} sw={5}/>
        <circle r={176} strokeWidth={2.5}/>
      </g>
      <g style={anim(15, 'cw')} transform="translate(340,340)">
        <circle r={162} strokeWidth={5}/>
        <Hexagram r={146} sw={4.5}/>
        <circle r={130} strokeWidth={2.5}/>
      </g>
      <g style={anim(18, 'ccw')} transform="translate(340,340)">
        <circle r={116} strokeWidth={4.5}/>
        <Octagram r={106} sw={4.5}/>
        <circle r={94} strokeWidth={2.5}/>
      </g>
      <g style={anim(10, 'cw')} transform="translate(340,340)">
        <circle r={80} strokeWidth={4.5}/>
        <Petals r={56} cr={14} n={6} sw={3.5}/>
        <Hexagram r={70} sw={3.5} op={0.8}/>
        <circle r={40} strokeWidth={2.5}/>
      </g>
      <g style={anim(7, 'ccw')} transform="translate(340,340)">
        <circle r={28} strokeWidth={4.5}/>
        <Hexagram r={18} sw={3.5}/>
      </g>
      <g style={anim(4, 'cw')} transform="translate(340,340)">
        <circle r={12} strokeWidth={4}/>
        <circle r={6} fill="currentColor" opacity={0.9} stroke="none"/>
      </g>
    </svg>
  )
}

// ── Planet A: outer ring + hexagram stack (deep purple) ──────────────
function PlanetA() {
  return (
    <svg viewBox="0 0 680 680" width="100%" height="100%" fill="none" stroke="currentColor" strokeLinecap="round">
      <g style={anim(55, 'cw')} transform="translate(340,340)">
        <circle r={308} strokeWidth={9}/>
        <circle r={295} strokeWidth={4}/>
        <Ticks r={308} n={12} len={22} sw={5}/>
      </g>
      <g style={anim(32, 'ccw')} transform="translate(340,340)">
        <circle r={256} strokeWidth={8}/>
        <Hexagram r={236} sw={7}/>
        <circle r={216} strokeWidth={4}/>
      </g>
      <g style={anim(18, 'cw')} transform="translate(340,340)">
        <circle r={166} strokeWidth={8}/>
        <Hexagram r={146} sw={6}/>
        <circle r={126} strokeWidth={4}/>
      </g>
      <g style={anim(9, 'ccw')} transform="translate(340,340)">
        <circle r={88} strokeWidth={8}/>
        <Hexagram r={68} sw={5}/>
      </g>
      <g style={anim(5, 'cw')} transform="translate(340,340)">
        <circle r={38} strokeWidth={7}/>
        <circle r={17} fill="currentColor" opacity={0.5} stroke="none"/>
        <circle r={8} fill="currentColor" opacity={0.9} stroke="none"/>
      </g>
    </svg>
  )
}

// ── Planet B: medallions + octagram (deep teal) ──────────────────────
function PlanetB() {
  return (
    <svg viewBox="0 0 680 680" width="100%" height="100%" fill="none" stroke="currentColor" strokeLinecap="round">
      <g style={anim(60, 'ccw')} transform="translate(340,340)">
        <circle r={308} strokeWidth={9}/>
        <circle r={295} strokeWidth={4}/>
      </g>
      <g style={anim(35, 'cw')} transform="translate(340,340)">
        <circle r={252} strokeWidth={8}/>
        <Medallions r={240} cr={22} n={6} sw={6}/>
        <circle r={216} strokeWidth={4}/>
      </g>
      <g style={anim(22, 'ccw')} transform="translate(340,340)">
        <circle r={172} strokeWidth={8}/>
        <Octagram r={154} sw={6}/>
        <circle r={134} strokeWidth={4}/>
      </g>
      <g style={anim(12, 'cw')} transform="translate(340,340)">
        <circle r={86} strokeWidth={8}/>
        <Hexagram r={66} sw={5}/>
      </g>
      <g style={anim(5, 'ccw')} transform="translate(340,340)">
        <circle r={36} strokeWidth={7}/>
        <circle r={16} fill="currentColor" opacity={0.5} stroke="none"/>
        <circle r={7} fill="currentColor" opacity={0.9} stroke="none"/>
      </g>
    </svg>
  )
}

// ── Planet C: crosshair + hexagram + petals (deep rose) ─────────────
function PlanetC() {
  return (
    <svg viewBox="0 0 680 680" width="100%" height="100%" fill="none" stroke="currentColor" strokeLinecap="round">
      <g style={anim(65, 'cw')} transform="translate(340,340)">
        <circle r={308} strokeWidth={9}/>
        {[0, 45, 90, 135].map(d => (
          <line key={d} x1={0} y1={-308} x2={0} y2={308} strokeWidth={3} opacity={0.4} transform={`rotate(${d})`}/>
        ))}
      </g>
      <g style={anim(38, 'ccw')} transform="translate(340,340)">
        <circle r={242} strokeWidth={8}/>
        <Hexagram r={224} sw={7}/>
        <circle r={204} strokeWidth={4}/>
      </g>
      <g style={anim(20, 'cw')} transform="translate(340,340)">
        <circle r={156} strokeWidth={8}/>
        <Petals r={90} cr={36} n={6} sw={5}/>
        <Hexagram r={146} sw={5} op={0.65}/>
      </g>
      <g style={anim(9, 'ccw')} transform="translate(340,340)">
        <circle r={66} strokeWidth={8}/>
        <Hexagram r={48} sw={5}/>
      </g>
      <g style={anim(4, 'cw')} transform="translate(340,340)">
        <circle r={32} strokeWidth={7}/>
        <circle r={14} fill="currentColor" opacity={0.5} stroke="none"/>
        <circle r={6} fill="currentColor" opacity={0.9} stroke="none"/>
      </g>
    </svg>
  )
}

// ── Planet D: double tick band + octagram (deep green) ──────────────
function PlanetD() {
  return (
    <svg viewBox="0 0 680 680" width="100%" height="100%" fill="none" stroke="currentColor" strokeLinecap="round">
      <g style={anim(58, 'ccw')} transform="translate(340,340)">
        <circle r={308} strokeWidth={9}/>
        <Ticks r={308} n={24} len={16} sw={4}/>
        <circle r={290} strokeWidth={4}/>
      </g>
      <g style={anim(32, 'cw')} transform="translate(340,340)">
        <circle r={252} strokeWidth={8}/>
        <Ticks r={252} n={12} len={20} sw={5}/>
        <circle r={230} strokeWidth={4}/>
      </g>
      <g style={anim(18, 'ccw')} transform="translate(340,340)">
        <circle r={172} strokeWidth={8}/>
        <Octagram r={154} sw={7}/>
        <circle r={134} strokeWidth={4}/>
        <Hexagram r={116} sw={4} op={0.7}/>
      </g>
      <g style={anim(8, 'cw')} transform="translate(340,340)">
        <circle r={78} strokeWidth={8}/>
        <Hexagram r={60} sw={5}/>
      </g>
      <g style={anim(4, 'ccw')} transform="translate(340,340)">
        <circle r={34} strokeWidth={7}/>
        <circle r={15} fill="currentColor" opacity={0.5} stroke="none"/>
        <circle r={7} fill="currentColor" opacity={0.9} stroke="none"/>
      </g>
    </svg>
  )
}

// ── Planet E: medallions + double hexagram (deep navy) ──────────────
function PlanetE() {
  return (
    <svg viewBox="0 0 680 680" width="100%" height="100%" fill="none" stroke="currentColor" strokeLinecap="round">
      <g style={anim(52, 'cw')} transform="translate(340,340)">
        <circle r={308} strokeWidth={9}/>
        <circle r={295} strokeWidth={4}/>
      </g>
      <g style={anim(30, 'ccw')} transform="translate(340,340)">
        <circle r={246} strokeWidth={8}/>
        <Medallions r={234} cr={20} n={6} sw={5}/>
        <circle r={211} strokeWidth={4}/>
      </g>
      <g style={anim(20, 'cw')} transform="translate(340,340)">
        <circle r={176} strokeWidth={8}/>
        <Hexagram r={156} sw={7}/>
        <circle r={136} strokeWidth={4}/>
      </g>
      <g style={anim(12, 'ccw')} transform="translate(340,340)">
        <circle r={104} strokeWidth={8}/>
        <Hexagram r={84} sw={6}/>
        <circle r={64} strokeWidth={4}/>
      </g>
      <g style={anim(6, 'cw')} transform="translate(340,340)">
        <circle r={40} strokeWidth={7}/>
        <circle r={18} fill="currentColor" opacity={0.5} stroke="none"/>
        <circle r={8} fill="currentColor" opacity={0.9} stroke="none"/>
      </g>
    </svg>
  )
}

interface Planet {
  orbitR: number; size: number; period: number
  startAngle: number; dir: 'cw' | 'ccw'
  color: string; opacity: number
  Component: React.FC
}

const ORBIT_RADII = [185, 310, 450]

const PLANETS: Planet[] = [
  { orbitR: 185, size: 280, period: 22, startAngle: 50,  dir: 'cw',  color: '#4a1278', opacity: 0.9,  Component: PlanetA },
  { orbitR: 310, size: 260, period: 38, startAngle: 140, dir: 'ccw', color: '#065868', opacity: 0.88, Component: PlanetB },
  { orbitR: 310, size: 260, period: 38, startAngle: 310, dir: 'ccw', color: '#720d38', opacity: 0.88, Component: PlanetC },
  { orbitR: 450, size: 240, period: 62, startAngle: 80,  dir: 'cw',  color: '#0d4820', opacity: 0.85, Component: PlanetD },
  { orbitR: 450, size: 220, period: 62, startAngle: 250, dir: 'cw',  color: '#0d2268', opacity: 0.85, Component: PlanetE },
]

export default function SolarSystemBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {ORBIT_RADII.map(r => (
        <div key={r} style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: r * 2, height: r * 2, borderRadius: '50%',
          border: '1px solid rgba(154,112,24,0.22)',
        }}/>
      ))}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400, height: 400, color: '#9a7018', opacity: 0.9,
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
              left: p.orbitR - p.size / 2,
              top: -p.size / 2,
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
