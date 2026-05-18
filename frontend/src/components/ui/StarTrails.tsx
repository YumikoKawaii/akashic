// 15° from vertical = 75° clockwise from horizontal
// Each outer div animates straight down+right; inner div rotates the trail visually
const TRAIL_ROT = 75

function StarTip({ size = 6 }: { size?: number }) {
  const R = size / 2
  const r = R * 0.22
  const s2 = r * Math.SQRT1_2
  const pts = [
    [0, -R], [s2, -s2], [R, 0], [s2, s2],
    [0, R],  [-s2, s2], [-R, 0], [-s2, -s2],
  ].map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  return (
    <svg width={size} height={size} viewBox={`${-R} ${-R} ${size} ${size}`}
      style={{ flexShrink: 0, overflow: 'visible',
               filter: 'drop-shadow(0 0 4px rgba(220,175,55,0.9))' }}>
      <polygon points={pts} fill="rgba(235,200,85,0.95)" />
    </svg>
  )
}

const TRAILS = Array.from({ length: 28 }, (_, i) => ({
  left:      `${(i * 3.6 + (i % 5) * 4.3) % 110 - 5}%`,
  length:    80 + (i * 17) % 120,
  thickness: i % 4 === 0 ? 3 : 2,
  starSize:  11 + (i % 4) * 3,
  duration:  `${3.5 + (i * 0.55) % 2.5}s`,
  delay:     `${-((i * 1.3) % 5)}s`,
  opacity:   0.38 + (i % 5) * 0.07,
}))

export default function StarTrails() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {TRAILS.map((t, i) => (
        // Outer: diagonal movement animation (down + slight rightward drift)
        <div key={i} style={{
          position: 'absolute',
          top: -(t.length + t.starSize + 10),
          left: t.left,
          opacity: t.opacity,
          animation: `star-trail ${t.duration} linear infinite`,
          animationDelay: t.delay,
        }}>
          {/* Inner: static rotation to angle the trail like rain */}
          <div style={{
            transform: `rotate(${TRAIL_ROT}deg)`,
            transformOrigin: '0 0',
            display: 'flex',
            alignItems: 'center',
          }}>
            <div style={{
              width: t.length,
              height: t.thickness,
              borderRadius: t.thickness,
              background: 'linear-gradient(90deg, transparent 0%, rgba(200,160,48,0.15) 20%, rgba(200,160,48,0.72) 80%, rgba(200,160,48,0.92) 100%)',
            }}/>
            <StarTip size={t.starSize} />
          </div>
        </div>
      ))}
    </div>
  )
}
