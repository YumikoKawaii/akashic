import { CSSProperties, ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export default function OrnatePanel({ children, className = '', style }: Props) {
  return (
    <div className={`ornate-panel ${className}`} style={style}>
      <div className="ornate-corner tl" />
      <div className="ornate-corner tr" />
      <div className="ornate-corner bl" />
      <div className="ornate-corner br" />
      <div className="corner-dot tl" />
      <div className="corner-dot tr" />
      <div className="corner-dot bl" />
      <div className="corner-dot br" />
      {children}
    </div>
  )
}
