// Very faint tiled alchemical/planetary symbols — background texture for panels.

const SYMBOLS = ['☿', '♄', '♃', '☉', '♁', '☽', '♀', '♂', '⊕', '△', '▽', '✦']

interface Props {
  opacity?: number
  cellSize?: number
}

export default function AlchemicalBg({ opacity = 0.055, cellSize = 52 }: Props) {
  // Render enough cells to overflow any typical panel size
  const cells = Array.from({ length: 200 }, (_, i) => ({
    symbol:  SYMBOLS[i % SYMBOLS.length],
    rotate:  ((i * 137) % 60) - 30,  // golden-angle spread of rotations
  }))

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      pointerEvents: 'none', zIndex: 0,
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, ${cellSize}px)`,
      alignContent: 'start',
      opacity,
    }}>
      {cells.map((c, i) => (
        <div key={i} style={{
          width: cellSize, height: cellSize,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Cinzel, serif',
          fontSize: '1rem',
          color: 'var(--gold)',
          transform: `rotate(${c.rotate}deg)`,
          userSelect: 'none',
        }}>
          {c.symbol}
        </div>
      ))}
    </div>
  )
}
