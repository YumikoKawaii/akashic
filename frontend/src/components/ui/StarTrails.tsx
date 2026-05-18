import React from 'react'

// 4-pointed sparkle star at the leading tip of each trail
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

const TRAILS = Array.from({ length: 14 }, (_, i) => ({
  top:      `${8 + (i * 6.7 + (i % 3) * 4.1) % 82}%`,
  width:    120 + (i * 23) % 140,
  height:   i % 4 === 0 ? 3 : 2,
  starSize: 11 + (i % 4) * 3,
  duration: `${8 + (i * 1.1) % 7}s`,
  delay:    `${-((i * 2.3) % 9)}s`,
  opacity:  0.35 + (i % 5) * 0.07,
}))

export default function StarTrails() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {TRAILS.map((t, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: t.top,
          left: -140,
          display: 'flex',
          alignItems: 'center',
          '--trail-opacity': t.opacity,
          animation: `star-trail ${t.duration} linear infinite`,
          animationDelay: t.delay,
        } as React.CSSProperties}>
          {/* gradient tail */}
          <div style={{
            width: t.width,
            height: t.height,
            borderRadius: t.height,
            background: 'linear-gradient(90deg, transparent 0%, rgba(200,160,48,0.15) 20%, rgba(200,160,48,0.72) 80%, rgba(200,160,48,0.92) 100%)',
          }}/>
          {/* leading star */}
          <StarTip size={t.starSize} />
        </div>
      ))}
    </div>
  )
}
