import { CSSProperties, ReactNode } from 'react'
import MagicCircle from './MagicCircle'
import RuneCorners from './RuneCorners'
import AlchemicalBg from './AlchemicalBg'
import OghamBorder from './OghamBorder'

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export default function OrnatePanel({ children, className = '', style }: Props) {
  return (
    <div className={`ornate-panel ${className}`} style={{ overflow: 'hidden', ...style }}>
      {/* alchemical symbol background texture */}
      <AlchemicalBg />

      {/* ogham border on the right side */}
      <OghamBorder side="right" color="var(--gold-dim)" opacity={0.38} />

      {/* top-right: large orbit quarter-arc */}
      <div style={{ position: 'absolute', top: -100, right: -100, width: 220, height: 220, color: 'var(--gold)', opacity: 0.55, pointerEvents: 'none', zIndex: 0 }}>
        <MagicCircle variant="orbit" speed={3} />
      </div>
      {/* bottom-left: large spark quarter-arc */}
      <div style={{ position: 'absolute', bottom: -100, left: -100, width: 200, height: 200, color: '#6b4c8a', opacity: 0.48, pointerEvents: 'none', zIndex: 0 }}>
        <MagicCircle variant="spark" speed={3} />
      </div>
      {/* bottom-right: small sigil accent */}
      <div style={{ position: 'absolute', bottom: -50, right: -50, width: 120, height: 120, color: 'var(--gold-dim)', opacity: 0.28, pointerEvents: 'none', zIndex: 0 }}>
        <MagicCircle variant="sigil" speed={1.5} />
      </div>

      {/* tl skipped — CSS chamfer occupies that corner */}
      <RuneCorners skip={['tl']} color="var(--gold-dim)" opacity={0.55} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}
