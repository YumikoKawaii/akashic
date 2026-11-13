import { CSSProperties, ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export default function OrnatePanel({ children, className = '', style }: Props) {
  return (
    <div className={`ornate-panel ${className}`} style={style}>
      {children}
    </div>
  )
}
