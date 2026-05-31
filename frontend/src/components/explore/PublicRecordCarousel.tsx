import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PublicBank } from '../../types'
import MagicCircle from '../ui/MagicCircle'

// Cards are books: tall and thin, with a spine on the left and a fore-edge on
// the right. Thinner than they are tall, so the carousel packs them tighter.
const SPACING  = 172
const CARD_W   = 210
const CARD_H   = 344
const FRAME    = 'rgba(154,112,24,0.55)'
const ACCENT   = 'rgba(154,112,24,0.55)'
const ROTATE_MS = 4000

function mod(n: number, m: number) { return ((n % m) + m) % m }

// An auto-rotating coverflow of public records, drawn as books on a shelf
// (spine + binding bands, cover, fore-edge pages) — same coverflow motion as the
// results-page QuestionCarousel (scaled/faded neighbours, a counter), advancing
// on its own until you interact.
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
          const scale    = Math.max(0.42, 1.0 - absSlot * 0.18)
          const x        = slot * SPACING
          const zIndex   = Math.round(20 - absSlot * 5)

          return (
            <div key={rec.id} style={{
              position: 'absolute', left: '50%', top: '50%',
              width: CARD_W,
              transform: `translate(calc(-50% + ${x}px), -50%) scale(${scale})`,
              opacity, zIndex,
              transition: isLive ? 'none' : 'transform 0.45s cubic-bezier(0.34,1.05,0.64,1), opacity 0.4s ease',
            }}>
              {/* The book cover */}
              <div style={{
                height: CARD_H, position: 'relative', overflow: 'hidden',
                background: 'var(--bg-card)',
                border: `1px solid ${FRAME}`,
                borderRadius: '5px',
                padding: '20px 16px 16px',
                display: 'flex', flexDirection: 'column',
                boxShadow: isCenter
                  ? '0 10px 30px rgba(154,112,24,0.32), 0 0 0 1px rgba(154,112,24,0.25)'
                  : '0 5px 16px rgba(0,0,0,0.12)',
              }}>
                {/* Magic circle — top-left corner */}
                <div style={{ position: 'absolute', top: -110, left: -110, width: 230, height: 230, opacity: isCenter ? 0.18 : 0.08, color: 'var(--gold)', pointerEvents: 'none' }}>
                  <MagicCircle variant="inner" speed={0.4} />
                </div>

                {/* Cover content */}
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  <div style={{ textAlign: 'center', color: 'var(--gold)', fontSize: '1.05rem', lineHeight: 1, marginBottom: 10 }}>◈</div>

                  <div style={{
                    fontFamily: 'Cinzel, serif', fontSize: '0.92rem', color: 'var(--ink)',
                    textAlign: 'center', lineHeight: 1.3, marginBottom: 10,
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  } as React.CSSProperties}>
                    {rec.name}
                  </div>

                  {/* Ornate divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT})` }} />
                    <div style={{ width: 3, height: 3, border: `1px solid ${ACCENT}`, transform: 'rotate(45deg)', flexShrink: 0 }} />
                    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${ACCENT}, transparent)` }} />
                  </div>

                  <p style={{
                    fontSize: '0.76rem', color: 'var(--ink-dim)', lineHeight: 1.5, margin: 0, flex: 1,
                    textAlign: 'center', overflow: 'hidden',
                    display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
                  } as React.CSSProperties}>
                    {rec.description || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>No description.</span>}
                  </p>

                  <div style={{ marginTop: 10, textAlign: 'center', fontSize: '0.7rem', color: 'var(--ink-dim)', lineHeight: 1.6 }}>
                    <div>{rec.question_count.toLocaleString()} questions</div>
                    <div>{rec.category_count} categories</div>
                    {rec.owner && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 4 }}>by {rec.owner.name}</div>}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
