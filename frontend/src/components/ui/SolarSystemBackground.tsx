import MagicCircle from './MagicCircle'

// All planet SVGs: viewBox="0 0 200 200", center at (100,100)
function spin(dur: number, dir: 'cw' | 'ccw') {
  return {
    animation: `mc-${dir} ${dur}s linear infinite`,
    transformBox: 'fill-box' as const,
    transformOrigin: 'center' as const,
  }
}

// ── Planet A: Compass Rose — 8-pointed star with cardinal diamonds ───
function CompassRose() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" fill="none"
      stroke="currentColor" strokeLinecap="round" strokeOpacity="0.82">
      <g transform="translate(100,100)">
        <g style={spin(70, 'cw')}>
          <circle r={88} strokeWidth="0.6"/>
          {/* 4 large cardinal diamonds */}
          {[0, 90, 180, 270].map(d => (
            <polygon key={d} transform={`rotate(${d})`}
              points="0,-88 -9,-66 0,-42 9,-66" strokeWidth="1.2"/>
          ))}
          {/* 4 small intercardinal diamonds */}
          {[45, 135, 225, 315].map(d => (
            <polygon key={d} transform={`rotate(${d})`}
              points="0,-88 -5,-76 0,-62 5,-76" strokeWidth="0.9"/>
          ))}
        </g>
        <g style={spin(42, 'ccw')}>
          <circle r={54} strokeWidth="1"/>
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1={0} y1={-47} x2={0} y2={-54}
              strokeWidth="1" transform={`rotate(${i * 45})`}/>
          ))}
        </g>
        <g style={spin(22, 'cw')}>
          <circle r={27} strokeWidth="1.2"/>
          <line x1={0} y1={-27} x2={0} y2={27} strokeWidth="0.9"/>
          <line x1={-27} y1={0} x2={27} y2={0} strokeWidth="0.9"/>
        </g>
        <circle r={9} strokeWidth="1"/>
        <circle r={4} fill="currentColor" fillOpacity="0.65" stroke="none"/>
      </g>
    </svg>
  )
}

// ── Planet B: Trefoil — 3 overlapping circles in triangle arrangement ─
function Trefoil() {
  const rd = 40, r3 = 42
  const nodes = [0, 120, 240].map(d => ({
    cx: rd * Math.sin(d * Math.PI / 180),
    cy: -rd * Math.cos(d * Math.PI / 180),
  }))
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" fill="none"
      stroke="currentColor" strokeLinecap="round" strokeOpacity="0.82">
      <g transform="translate(100,100)">
        <g style={spin(80, 'ccw')}>
          <circle r={88} strokeWidth="0.6"/>
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1={0} y1={-83} x2={0} y2={-88}
              strokeWidth="1.1" transform={`rotate(${i * 30})`}/>
          ))}
        </g>
        <g style={spin(40, 'cw')}>
          {nodes.map((n, i) => (
            <circle key={i} cx={n.cx} cy={n.cy} r={r3} strokeWidth="1.3"/>
          ))}
          <polygon points={nodes.map(n => `${n.cx},${n.cy}`).join(' ')} strokeWidth="0.9"/>
        </g>
        <g style={spin(20, 'ccw')}>
          <circle r={22} strokeWidth="1.2"/>
          <circle r={11} strokeWidth="0.9"/>
        </g>
        <circle r={5} fill="currentColor" fillOpacity="0.65" stroke="none"/>
      </g>
    </svg>
  )
}

// ── Planet C: Pentacle — nested pentagons and pentagram stars ─────────
function Pentacle() {
  const verts = (r: number) =>
    Array.from({ length: 5 }, (_, i) => {
      const a = (i * 72 - 90) * Math.PI / 180
      return [r * Math.cos(a), r * Math.sin(a)] as [number, number]
    })
  const pentagon = (r: number) =>
    verts(r).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const pentagram = (r: number) => {
    const v = verts(r)
    return [0, 2, 4, 1, 3]
      .map((i, j) => `${j === 0 ? 'M' : 'L'}${v[i][0].toFixed(1)},${v[i][1].toFixed(1)}`)
      .join(' ') + 'Z'
  }
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" fill="none"
      stroke="currentColor" strokeLinecap="round" strokeOpacity="0.82">
      <g transform="translate(100,100)">
        <g style={spin(75, 'cw')}>
          <circle r={88} strokeWidth="0.6"/>
          {verts(88).map(([x, y], i) => (
            <line key={i} x1={x * 0.93} y1={y * 0.93} x2={x} y2={y} strokeWidth="1.3"/>
          ))}
        </g>
        <g style={spin(48, 'ccw')}>
          <polygon points={pentagon(72)} strokeWidth="1.2"/>
          <path d={pentagram(72)} strokeWidth="1.2" strokeLinejoin="round"/>
        </g>
        <g style={spin(28, 'cw')}>
          <polygon points={pentagon(38)} strokeWidth="1"/>
          <path d={pentagram(38)} strokeWidth="1" strokeLinejoin="round"/>
        </g>
        <circle r={14} strokeWidth="1.1"/>
        <circle r={5} fill="currentColor" fillOpacity="0.65" stroke="none"/>
      </g>
    </svg>
  )
}

// ── Planet D: Solar Wheel — spokes radiating from central hub ─────────
function SolarWheel() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" fill="none"
      stroke="currentColor" strokeLinecap="round" strokeOpacity="0.82">
      <g transform="translate(100,100)">
        <g style={spin(65, 'cw')}>
          <circle r={88} strokeWidth="0.6"/>
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1={0} y1={-88} x2={0} y2={-28}
              strokeWidth="1" transform={`rotate(${i * 45})`}/>
          ))}
          <circle r={28} strokeWidth="1.2"/>
        </g>
        <g style={spin(35, 'ccw')}>
          <circle r={57} strokeWidth="0.9"/>
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1={0} y1={-51} x2={0} y2={-57}
              strokeWidth="0.9" transform={`rotate(${i * 45})`}/>
          ))}
        </g>
        <g style={spin(18, 'cw')}>
          <circle r={17} strokeWidth="1.2"/>
          <line x1={0} y1={-17} x2={0} y2={17} strokeWidth="0.9"/>
          <line x1={-17} y1={0} x2={17} y2={0} strokeWidth="0.9"/>
        </g>
        <circle r={6} fill="currentColor" fillOpacity="0.65" stroke="none"/>
      </g>
    </svg>
  )
}

// ── Orbit layout ───────────────────────────────────────────────────────
const ORBIT_RINGS = [210, 340, 460]

const PLANETS = [
  { orbitR: 210, size: 160, period: 25, startAngle: 60,  dir: 'cw'  as const, color: '#4a1278', opacity: 0.88, Planet: CompassRose },
  { orbitR: 340, size: 120, period: 42, startAngle: 130, dir: 'ccw' as const, color: '#065868', opacity: 0.85, Planet: Trefoil    },
  { orbitR: 340, size: 120, period: 42, startAngle: 300, dir: 'ccw' as const, color: '#720d38', opacity: 0.85, Planet: Pentacle   },
  { orbitR: 460, size:  85, period: 68, startAngle: 75,  dir: 'cw'  as const, color: '#0d2268', opacity: 0.82, Planet: SolarWheel },
]

export default function SolarSystemBackground({ flash }: {
  flash?: { key: number; type: 'correct' | 'wrong' } | null
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>

      {ORBIT_RINGS.map(r => (
        <div key={r} style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: r * 2, height: r * 2, borderRadius: '50%',
          border: '1px solid rgba(154,112,24,0.16)',
        }}/>
      ))}

      {/* Center sun — keep the original magic circle */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 260, height: 260, color: '#9a7018', opacity: 0.85,
      }}>
        <MagicCircle variant="full"/>
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
              <p.Planet/>
            </div>
          </div>
        )
      })}

      {flash && <div key={flash.key} className={`bg-flash bg-flash-${flash.type}`}/>}
    </div>
  )
}
