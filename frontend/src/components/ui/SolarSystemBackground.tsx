import MagicCircle from './MagicCircle'

// Each planet is itself a mini magic circle, matching the reference image
interface Planet {
  orbitR: number
  size: number
  period: number
  startAngle: number
  dir: 'cw' | 'ccw'
  color: string
  variant: 'full' | 'orbit' | 'halo' | 'sigil' | 'spark'
  opacity: number
  mcSpeed: number
}

const ORBIT_RADII = [145, 245, 360]

const PLANETS: Planet[] = [
  // inner orbit — 1 large ring-world
  { orbitR: 145, size: 70,  period: 22,  startAngle: 50,  dir: 'cw',  color: 'var(--gold)', variant: 'full',  opacity: 0.48, mcSpeed: 1.8 },
  // middle orbit — 2 ring-worlds
  { orbitR: 245, size: 58,  period: 38,  startAngle: 140, dir: 'ccw', color: 'var(--gold)', variant: 'orbit', opacity: 0.40, mcSpeed: 1.4 },
  { orbitR: 245, size: 52,  period: 38,  startAngle: 320, dir: 'ccw', color: '#7c5a9a',     variant: 'full',  opacity: 0.30, mcSpeed: 1.6 },
  // outer orbit — 2 smaller ring-worlds
  { orbitR: 360, size: 50,  period: 60,  startAngle: 70,  dir: 'cw',  color: 'var(--gold)', variant: 'orbit', opacity: 0.32, mcSpeed: 1.0 },
  { orbitR: 360, size: 42,  period: 60,  startAngle: 240, dir: 'cw',  color: '#7c5a9a',     variant: 'full',  opacity: 0.24, mcSpeed: 0.9 },
]

export default function SolarSystemBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>

      {/* orbit rings */}
      {ORBIT_RADII.map(r => (
        <div key={r} style={{
          position: 'absolute',
          left: '50%', top: '63%',
          transform: 'translate(-50%, -50%)',
          width: r * 2, height: r * 2,
          borderRadius: '50%',
          border: '1px solid rgba(154,112,24,0.11)',
          boxShadow: '0 0 12px rgba(154,112,24,0.04) inset',
        }} />
      ))}

      {/* center sun — large elaborate magic circle */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '63%',
        transform: 'translate(-50%, -50%)',
        width: 200, height: 200,
        color: 'var(--gold)', opacity: 0.32,
      }}>
        <MagicCircle variant="full" speed={0.28} />
      </div>

      {/* planets */}
      {PLANETS.map((p, i) => {
        const delay = -((p.startAngle / 360) * p.period)
        return (
          <div key={i} style={{
            position: 'absolute',
            left: '50%', top: '63%',
            width: 0, height: 0,
            animation: `mc-${p.dir} ${p.period}s linear infinite`,
            animationDelay: `${delay}s`,
            transformOrigin: '0 0',
          }}>
            {/* counter-rotates so the planet ring keeps its orientation */}
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
