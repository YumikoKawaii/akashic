// Ember motes — tiny golden particles that drift upward and fade out
const MOTES = Array.from({ length: 18 }, (_, i) => ({
  left:     `${(i * 5.7 + (i % 5) * 3.3) % 100}%`,
  duration: `${4.8 + (i * 0.71) % 3.4}s`,
  delay:    `${-((i * 1.3) % 5.5)}s`,
  size:     1.4 + (i % 4) * 0.55,
  tx:       ((i % 7) - 3) * 3.5,
}))

export default function EmberMotes() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {MOTES.map((m, i) => (
        <div key={i} style={{
          position: 'absolute',
          bottom: 6,
          left: m.left,
          width: m.size,
          height: m.size,
          borderRadius: '50%',
          background: 'var(--gold)',
          boxShadow: `0 0 ${m.size * 2.5}px rgba(200,160,48,0.85)`,
          '--mote-tx': `${m.tx}px`,
          animation: `ember-rise ${m.duration} ease-out infinite`,
          animationDelay: m.delay,
        } as React.CSSProperties}/>
      ))}
    </div>
  )
}
