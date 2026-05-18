import MagicCircle from './MagicCircle'

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

const ORBIT_RADII = [130, 215, 310]

const PLANETS: Planet[] = [
  // inner — gold
  { orbitR: 130, size: 130, period: 20,  startAngle: 50,  dir: 'cw',  color: '#c8900a', variant: 'full',  opacity: 0.70, mcSpeed: 1.6 },
  // middle — purple + teal
  { orbitR: 215, size: 110, period: 36,  startAngle: 140, dir: 'ccw', color: '#7c3aaa', variant: 'orbit', opacity: 0.62, mcSpeed: 1.2 },
  { orbitR: 215, size: 105, period: 36,  startAngle: 320, dir: 'ccw', color: '#1a8a9a', variant: 'full',  opacity: 0.58, mcSpeed: 1.4 },
  // outer — rose + sage
  { orbitR: 310, size:  95, period: 58,  startAngle: 70,  dir: 'cw',  color: '#b03468', variant: 'orbit', opacity: 0.55, mcSpeed: 1.0 },
  { orbitR: 310, size:  88, period: 58,  startAngle: 245, dir: 'cw',  color: '#2a8a50', variant: 'full',  opacity: 0.50, mcSpeed: 0.9 },
]

export default function SolarSystemBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>

      {/* orbit rings */}
      {ORBIT_RADII.map(r => (
        <div key={r} style={{
          position: 'absolute',
          left: '50%', top: '60%',
          transform: 'translate(-50%, -50%)',
          width: r * 2, height: r * 2,
          borderRadius: '50%',
          border: '1px solid rgba(154,112,24,0.18)',
        }} />
      ))}

      {/* center sun */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '60%',
        transform: 'translate(-50%, -50%)',
        width: 240, height: 240,
        color: '#c8900a', opacity: 0.55,
      }}>
        <MagicCircle variant="full" speed={0.28} />
      </div>

      {/* planets */}
      {PLANETS.map((p, i) => {
        const delay = -((p.startAngle / 360) * p.period)
        return (
          <div key={i} style={{
            position: 'absolute',
            left: '50%', top: '60%',
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
