import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PublicBank } from '../../types'

// Cards are books: tall and thin, with a spine on the left and a fore-edge on
// the right. Thinner than they are tall, so the carousel packs them tighter.
const SPACING  = 172
const CARD_W   = 210
const CARD_H   = 280
const FRAME    = 'var(--border-dim)'
const ROTATE_MS = 4000
// Radiant gold aura for the centre card — same treatment as the results carousel.
const GLOW = 'drop-shadow(0 10px 24px rgba(43,29,31,0.14))'

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

  // If a refetch returns fewer records (e.g. a public bank went private),
  // keep the index inside the new bounds.
  useEffect(() => {
    if (n > 0) setActiveIndex(i => (i >= n ? 0 : i))
  }, [n])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // The home page autofocuses its search input — moving the text caret
      // with arrow keys must not also spin the carousel.
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
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
      const center = records[mod(activeIndex, n)]
      if (slot === 0) { if (center) navigate(`/banks/${center.id}`) }
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
              filter: isCenter ? GLOW : undefined,
              transition: isLive ? 'none' : 'transform 0.45s cubic-bezier(0.34,1.05,0.64,1), opacity 0.4s ease, filter 0.4s ease',
            }}>
              {/* The book cover */}
              <div style={{
                height: CARD_H, position: 'relative', overflow: 'hidden',
                background: 'var(--bg-card)',
                border: `1px solid ${FRAME}`,
                borderRadius: '10px',
                padding: '22px 18px 18px',
                display: 'flex', flexDirection: 'column',
                boxShadow: isCenter ? 'none' : '0 4px 12px rgba(43,29,31,0.08)',
              }}>

                {/* Cover content */}
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--gold)', marginBottom: 10 }}><svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6.5 1.5v4.2L2.9 12.6a1.3 1.3 0 0 0 1.1 1.9h8a1.3 1.3 0 0 0 1.1-1.9L9.5 5.7V1.5M5.5 1.5h5" stroke="currentColor" strokeLinejoin="round" strokeLinecap="round" /></svg></div>

                  <div style={{
                    fontFamily: 'Newsreader, serif', fontSize: '1.15rem', fontWeight: 600, color: 'var(--ink)',
                    textAlign: 'center', lineHeight: 1.3, marginBottom: 10,
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  } as React.CSSProperties}>
                    {rec.name}
                  </div>

                  <p style={{
                    fontSize: '0.85rem', color: 'var(--ink-dim)', lineHeight: 1.5, margin: 0, flex: 1,
                    textAlign: 'center', overflow: 'hidden',
                    display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
                  } as React.CSSProperties}>
                    {rec.description}
                  </p>

                  <div style={{ marginTop: 10, paddingTop: 12, borderTop: '1px solid var(--border-dim)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--ink-dim)', lineHeight: 1.6 }}>
                    <div>{rec.question_count.toLocaleString()} questions</div>
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
