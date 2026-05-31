import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PublicBank } from '../../types'
import MagicCircle from '../ui/MagicCircle'

const SPACING  = 232
const CARD_W   = 300
const CARD_H   = 248
const CHAMFER  = 'polygon(13px 0%, 100% 0%, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0% 100%, 0% 13px)'
const FRAME    = 'rgba(154,112,24,0.55)'
const ACCENT   = 'rgba(154,112,24,0.55)'
const ROTATE_MS = 4000

function mod(n: number, m: number) { return ((n % m) + m) % m }

// An auto-rotating coverflow of public records — same motion family as the
// results-page QuestionCarousel (chamfered shells, magic-circle glow, scaled/
// faded neighbours, a counter), advancing on its own until you interact.
export default function PublicRecordCarousel({ records, autoRotate = true }: { records: PublicBank[]; autoRotate?: boolean }) {
  const navigate = useNavigate()
  const [activeIndex, setActiveIndex] = useState(0)
  const [dragOffset, setDragOffset]   = useState(0)
  const [paused, setPaused]           = useState(false)
  const dragStartX = useRef<number | null>(null)
  const movedRef   = useRef(false)
  const n = records.length

  // Auto-rotate while idle (not hovered/dragging, multiple cards, allowed).
  useEffect(() => {
    if (!autoRotate || paused || n <= 1 || dragOffset !== 0) return
    const t = setInterval(() => setActiveIndex(i => mod(i + 1, n)), ROTATE_MS)
    return () => clearInterval(t)
  }, [autoRotate, paused, n, dragOffset])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setActiveIndex(i => mod(i + 1, n))
      if (e.key === 'ArrowLeft')  setActiveIndex(i => mod(i - 1, n))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [n])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartX.current = e.clientX
    movedRef.current   = false
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return
    const dx = e.clientX - dragStartX.current
    if (Math.abs(dx) > 8) movedRef.current = true
    setDragOffset(dx)
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return
    if (!movedRef.current) {
      const rect   = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - (rect.left + rect.width / 2)
      const slot   = Math.max(-2, Math.min(2, Math.round(clickX / SPACING)))
      if (slot === 0) navigate(`/banks/${records[activeIndex].id}`)
      else            setActiveIndex(i => mod(i + slot, n))
    } else {
      if (dragOffset < -70)      setActiveIndex(i => mod(i + 1, n))
      else if (dragOffset > 70)  setActiveIndex(i => mod(i - 1, n))
    }
    dragStartX.current = null
    setDragOffset(0)
  }

  if (n === 0) return null
  const isLive = dragOffset !== 0

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div
        style={{
          position: 'relative', width: '100%', height: CARD_H + 50,
          userSelect: 'none', overflow: 'hidden',
          cursor: isLive ? 'grabbing' : 'grab',
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { dragStartX.current = null; setDragOffset(0) }}
      >
        {records.map((rec, i) => {
          let rawSlot = i - activeIndex
          if (rawSlot >  n / 2) rawSlot -= n
          if (rawSlot < -n / 2) rawSlot += n

          const slot    = rawSlot - dragOffset / SPACING
          const absSlot = Math.abs(slot)
          if (absSlot > 3) return null

          const isCenter = rawSlot === 0
          const opacity  = Math.max(0, 1.0 - absSlot * 0.34)
          const scale    = Math.max(0.4, 1.0 - absSlot * 0.2)
          const x        = slot * SPACING
          const zIndex   = Math.round(20 - absSlot * 5)
          const glow     = isCenter
            ? 'drop-shadow(0 0 5px rgba(154,112,24,0.55)) drop-shadow(0 0 14px rgba(154,112,24,0.28))'
            : undefined

          return (
            <div key={rec.id} style={{
              position: 'absolute', left: '50%', top: '50%',
              width: CARD_W,
              transform: `translate(calc(-50% + ${x}px), -50%) scale(${scale})`,
              opacity, zIndex, filter: glow,
              transition: isLive ? 'none' : 'transform 0.45s cubic-bezier(0.34,1.05,0.64,1), opacity 0.4s ease',
            }}>
              <div style={{ clipPath: CHAMFER, background: FRAME, padding: '1px' }}>
                <div style={{ clipPath: CHAMFER, background: 'var(--bg-card)', height: CARD_H, position: 'relative', overflow: 'hidden', padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
                  {/* Magic circle — BR corner */}
                  <div style={{ position: 'absolute', bottom: -150, right: -150, width: 300, height: 300, opacity: isCenter ? 0.18 : 0.08, color: 'var(--gold)', pointerEvents: 'none' }}>
                    <MagicCircle variant="inner" speed={0.4} />
                  </div>
                  {/* Top accent bar */}
                  <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 2, background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)` }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: 'var(--gold)', fontSize: '0.9rem', lineHeight: 1 }}>◈</span>
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rec.name}
                    </span>
                  </div>

                  <p style={{
                    fontSize: '0.82rem', color: 'var(--ink-dim)', lineHeight: 1.55, margin: 0, flex: 1,
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                  } as React.CSSProperties}>
                    {rec.description || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>No description.</span>}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '10px 0 8px' }}>
                    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)` }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: 'var(--ink-dim)' }}>
                    <span>{rec.question_count.toLocaleString()} q · {rec.category_count} cat</span>
                    {rec.owner && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>by {rec.owner.name}</span>}
                  </div>

                  {isCenter && (
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: 12, fontSize: '0.62rem', padding: '6px 14px', alignSelf: 'center' }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/banks/${rec.id}`) }}
                    >
                      Open →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Counter + dots */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn btn-ghost" style={{ fontSize: '0.7rem', padding: '4px 10px' }} onClick={() => setActiveIndex(i => mod(i - 1, n))}>‹</button>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.22em', color: 'var(--gold-dim)' }}>
            {String(activeIndex + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
          </span>
          <button className="btn btn-ghost" style={{ fontSize: '0.7rem', padding: '4px 10px' }} onClick={() => setActiveIndex(i => mod(i + 1, n))}>›</button>
        </div>
      </div>
    </div>
  )
}
