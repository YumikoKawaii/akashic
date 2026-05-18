import MagicCircle from './MagicCircle'

type Variant = 'full' | 'outer' | 'inner'

interface PlanetConfig {
  orbitR: number; size: number; period: number
  startAngle: number; dir: 'cw' | 'ccw'
  color: string; opacity: number; variant: Variant
}

const PLANETS: PlanetConfig[] = [
  { orbitR: 210, size: 200, period: 25, startAngle: 60,  dir: 'cw',  color: '#4a1278', opacity: 0.88, variant: 'full'  },
  { orbitR: 340, size: 185, period: 42, startAngle: 130, dir: 'ccw', color: '#065868', opacity: 0.85, variant: 'outer' },
  { orbitR: 340, size: 185, period: 42, startAngle: 300, dir: 'ccw', color: '#720d38', opacity: 0.85, variant: 'inner' },
  { orbitR: 460, size: 170, period: 68, startAngle: 75,  dir: 'cw',  color: '#0d2268', opacity: 0.82, variant: 'full'  },
]

const ORBIT_RINGS = [210, 340, 460]

export default function SolarSystemBackground() {
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

      {/* Center sun */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 280, height: 280,
        color: '#9a7018', opacity: 0.85,
      }}>
        <MagicCircle variant="full" />
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
              <MagicCircle variant={p.variant} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
