import MagicCircle from './MagicCircle'

type Variant = 'full' | 'outer' | 'inner'

interface Planet {
  orbitR: number
  size: number
  period: number
  startAngle: number
  dir: 'cw' | 'ccw'
  color: string
  variant: Variant
  opacity: number
  mcSpeed: number
}

const ORBIT_RADII = [185, 310, 450]

const PLANETS: Planet[] = [
  // inner — deep purple, full mandala
  { orbitR: 185, size: 160, period: 22,  startAngle: 50,  dir: 'cw',  color: '#5a1a8a', variant: 'full',  opacity: 0.88, mcSpeed: 1.5 },
  // middle — dark teal (outer rings) + deep rose (inner geometry)
  { orbitR: 310, size: 140, period: 38,  startAngle: 140, dir: 'ccw', color: '#0a6878', variant: 'outer', opacity: 0.85, mcSpeed: 1.2 },
  { orbitR: 310, size: 135, period: 38,  startAngle: 310, dir: 'ccw', color: '#8a1848', variant: 'inner', opacity: 0.85, mcSpeed: 1.4 },
  // outer — dark sage (full) + dark blue-indigo (outer rings)
  { orbitR: 450, size: 120, period: 62,  startAngle: 80,  dir: 'cw',  color: '#1a6838', variant: 'full',  opacity: 0.80, mcSpeed: 1.0 },
  { orbitR: 450, size: 112, period: 62,  startAngle: 250, dir: 'cw',  color: '#1a3888', variant: 'outer', opacity: 0.78, mcSpeed: 0.9 },
]

export default function SolarSystemBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>

      {/* orbit rings */}
      {ORBIT_RADII.map(r => (
        <div key={r} style={{
          position: 'absolute',
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: r * 2, height: r * 2,
          borderRadius: '50%',
          border: '1px solid rgba(154,112,24,0.20)',
        }} />
      ))}

      {/* center sun — large detailed magic circle, overlaps content intentionally */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 280, height: 280,
        color: '#c8900a', opacity: 0.85,
      }}>
        <MagicCircle variant="full" speed={0.28} />
      </div>

      {/* planets — all 'full' variant for maximum ring detail */}
      {PLANETS.map((p, i) => {
        const delay = -((p.startAngle / 360) * p.period)
        return (
          <div key={i} style={{
            position: 'absolute',
            left: '50%', top: '50%',
            width: 0, height: 0,
            animation: `mc-${p.dir} ${p.period}s linear infinite`,
            animationDelay: `${delay}s`,
            transformOrigin: '0 0',
          }}>
            <div style={{
              position: 'absolute',
              left:  p.orbitR - p.size / 2,
              top:  -p.size / 2,
              width: p.size, height: p.size,
              color: p.color, opacity: p.opacity,
              animation: `mc-${p.dir === 'cw' ? 'ccw' : 'cw'} ${p.period}s linear infinite`,
              animationDelay: `${delay}s`,
              transformOrigin: 'center',
            }}>
              <MagicCircle variant={p.variant} speed={p.mcSpeed} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
