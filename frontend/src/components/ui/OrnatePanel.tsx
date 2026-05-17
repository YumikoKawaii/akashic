import { CSSProperties, ReactNode } from 'react'
import MagicCircle from './MagicCircle'

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export default function OrnatePanel({ children, className = '', style }: Props) {
  return (
    <div className={`ornate-panel ${className}`} style={{ overflow: 'hidden', ...style }}>
      <div style={{ position: 'absolute', top: -38, right: -38, width: 95, height: 95, color: 'var(--gold)', opacity: 0.22, pointerEvents: 'none', zIndex: 0 }}>
        <MagicCircle variant="orbit" speed={3} />
      </div>
      <div style={{ position: 'absolute', bottom: -38, left: -38, width: 85, height: 85, color: '#6b4c8a', opacity: 0.20, pointerEvents: 'none', zIndex: 0 }}>
        <MagicCircle variant="spark" speed={3} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}
