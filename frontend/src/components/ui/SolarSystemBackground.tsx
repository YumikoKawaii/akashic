import MagicCircle from './MagicCircle'

interface Planet {
  orbitR: number
  size: number
  period: number
  startAngle: number
  dir: 'cw' | 'ccw'
  color: string
  variant: 'halo' | 'sigil' | 'spark' | 'orbit' | 'full'
  opacity: number
  mcSpeed: number
}

const ORBIT_RADII = [120, 205, 310]

const PLANETS: Planet[] = [
  // inner orbit — 1 planet
  { orbitR: 120, size: 40, period: 18,  startAngle: 60,  dir: 'cw',  color: 'var(--gold)', variant: 'halo',  opacity: 0.52, mcSpeed: 2.2 },
  // middle orbit — 2 planets
  { orbitR: 205, size: 30, period: 32,  startAngle: 130, dir: 'ccw', color: 'var(--gold)', variant: 'sigil', opacity: 0.42, mcSpeed: 1.6 },
  { orbitR: 205, size: 26, period: 32,  startAngle: 310, dir: 'ccw', color: '#7c5a9a',     variant: 'halo',  opacity: 0.30, mcSpeed: 1.8 },
  // outer orbit — 3 planets
  { orbitR: 310, size: 24, period: 52,  startAngle: 20,  dir: 'cw',  color: 'var(--gold)', variant: 'spark', opacity: 0.35, mcSpeed: 1.0 },
  { orbitR: 310, size: 18, period: 52,  startAngle: 155, dir: 'cw',  color: '#7c5a9a',     variant: 'halo',  opacity: 0.25, mcSpeed: 1.2 },
  { orbitR: 310, size: 22, period: 52,  startAngle: 270, dir: 'cw',  color: 'var(--gold)', variant: 'orbit', opacity: 0.28, mcSpeed: 0.9 },
]

export default function SolarSystemBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>

      {/* orbit rings */}
      {ORBIT_RADII.map(r => (
        <div key={r} style={{
          position: 'absolute',
          left: '50%', top: '62%',
          transform: 'translate(-50%, -50%)',
          width: r * 2, height: r * 2,
          borderRadius: '50%',
          border: '1px solid rgba(154,112,24,0.09)',
        }} />
      ))}

      {/* center sun */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '62%',
        transform: 'translate(-50%, -50%)',
        width: 160, height: 160,
        color: 'var(--gold)', opacity: 0.30,
      }}>
        <MagicCircle variant="full" speed={0.32} />
      </div>

      {/* planets — each is an orbit arm (rotates around the solar center) */}
      {PLANETS.map((p, i) => {
        const delay = -((p.startAngle / 360) * p.period)
        return (
          <div key={i} style={{
            position: 'absolute',
            left: '50%', top: '62%',
            width: 0, height: 0,
            animation: `mc-${p.dir} ${p.period}s linear infinite`,
            animationDelay: `${delay}s`,
            transformOrigin: '0 0',
          }}>
            {/* planet — offset to orbit radius, counter-rotates to stay upright */}
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
