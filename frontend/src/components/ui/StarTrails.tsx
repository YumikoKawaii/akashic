// Star trails — thin golden streaks sliding left-to-right across the header
const TRAILS = Array.from({ length: 14 }, (_, i) => ({
  top:      `${8 + (i * 6.7 + (i % 3) * 4.1) % 82}%`,
  width:    50 + (i * 13) % 72,
  height:   i % 4 === 0 ? 1.5 : 1,
  duration: `${8 + (i * 1.1) % 7}s`,
  delay:    `${-((i * 2.3) % 9)}s`,
  opacity:  0.28 + (i % 5) * 0.06,
}))

export default function StarTrails() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {TRAILS.map((t, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: t.top,
          left: -130,
          width: t.width,
          height: t.height,
          borderRadius: t.height,
          background: 'linear-gradient(90deg, transparent 0%, rgba(200,160,48,0.18) 20%, rgba(200,160,48,0.75) 78%, rgba(200,160,48,0.95) 90%, transparent 100%)',
          boxShadow: '0 0 3px rgba(200,160,48,0.45)',
          '--trail-opacity': t.opacity,
          animation: `star-trail ${t.duration} linear infinite`,
          animationDelay: t.delay,
        } as React.CSSProperties}/>
      ))}
    </div>
  )
}
