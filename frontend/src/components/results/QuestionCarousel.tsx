import React, { useState, useRef, useEffect } from 'react'
import { Question } from '../../types'
import MagicCircle from '../ui/MagicCircle'
import { TypeTag, DifficultyTag } from '../ui/Tag'

export interface CardData {
  index: number
  question: Question
  userAnswer: string | undefined
  correct: boolean | null
}

interface Props {
  cards: CardData[]
}

const SPACING    = 200
const CARD_W     = 155
const CARD_H     = 320
const EXPANDED_W = 540
const CHAMFER    = 'polygon(13px 0%, 100% 0%, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0% 100%, 0% 13px)'
const FRAME      = 'rgba(154,112,24,0.55)'
const ACCENT     = 'rgba(154,112,24,0.55)'

function mod(n: number, m: number) { return ((n % m) + m) % m }
function questionText(q: Question) { return q.item?.content ?? q.choice?.content ?? '' }

// ── Answer detail renderer ────────────────────────────────────────────────────
function AnswerDetail({ question: q, userAnswer, correct }: Omit<CardData, 'index'>) {
  const content = questionText(q)

  if (q.choice) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {q.choice.options.map(opt => {
        const isCorrectOpt = q.choice!.answers.includes(opt.key)
        const isSelected   = userAnswer?.split('|').map(s => s.trim()).includes(opt.key) ?? false
        return (
          <div key={opt.key} style={{
            padding: '7px 12px', border: '1px solid',
            borderColor: isCorrectOpt ? 'rgba(42,138,58,0.5)' : isSelected ? 'rgba(176,48,48,0.5)' : 'var(--border-dim)',
            background: isCorrectOpt ? 'rgba(42,138,58,0.06)' : isSelected ? 'rgba(176,48,48,0.06)' : 'transparent',
            fontSize: '0.8rem', color: 'var(--ink)',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.62rem', color: 'var(--gold-dim)', minWidth: 12, flexShrink: 0 }}>
              {opt.key}
            </span>
            <span style={{ flex: 1, lineHeight: 1.45 }}>{opt.text}</span>
            {isCorrectOpt && <span style={{ color: '#2a8a3a', fontSize: '0.76rem', flexShrink: 0 }}>✓</span>}
          </div>
        )
      })}
    </div>
  )

  if (q.item && ['tf_ng','yn_ng','matching_headings','matching_information','matching_features'].includes(q.type)) return (
    <div style={{ fontSize: '0.86rem', color: 'var(--ink-dim)', lineHeight: 2 }}>
      Your answer:{' '}
      <strong style={{ color: correct ? '#2a8a3a' : '#b03030' }}>{userAnswer ?? '—'}</strong>
      {'  ·  '}Correct:{' '}
      <strong style={{ color: '#2a8a3a' }}>{q.item.answer}</strong>
    </div>
  )

  if (q.item && ['sentence_completion','form_completion'].includes(q.type)) {
    const parts = content.split('___')
    return (
      <div style={{ fontSize: '0.88rem', lineHeight: 2, color: 'var(--ink)' }}>
        {parts.map((part, pi) => (
          <span key={pi}>
            {part}
            {pi < parts.length - 1 && (
              <span style={{
                display: 'inline-block', padding: '0 10px',
                borderBottom: `2px solid ${correct ? 'rgba(42,138,58,0.7)' : 'rgba(176,48,48,0.7)'}`,
                color: correct ? '#2a8a3a' : '#b03030',
                fontWeight: 600, minWidth: 56, textAlign: 'center',
              }}>
                {userAnswer || '—'}
              </span>
            )}
          </span>
        ))}
        {!correct && q.item && (
          <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--ink-dim)' }}>
            Correct: <strong style={{ color: '#2a8a3a' }}>{q.item.answer}</strong>
          </div>
        )}
      </div>
    )
  }

  if (q.item && q.type === 'short_answer') return (
    <div style={{ background: 'rgba(154,112,24,0.04)', border: '1px solid var(--border-dim)', padding: '10px 14px', fontSize: '0.86rem' }}>
      <div style={{ color: 'var(--ink-dim)', fontSize: '0.68rem', marginBottom: 4 }}>Your answer</div>
      <div style={{ color: 'var(--ink)' }}>
        {userAnswer || <span style={{ fontStyle: 'italic', color: 'var(--ink-dim)' }}>No answer provided</span>}
      </div>
      <div style={{ color: 'var(--ink-dim)', fontSize: '0.68rem', marginTop: 10, marginBottom: 4 }}>Reference answer</div>
      <div style={{ color: '#2a8a3a' }}>{q.item.answer}</div>
    </div>
  )

  return null
}

// ── Main component ────────────────────────────────────────────────────────────
export default function QuestionCarousel({ cards }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [dragOffset, setDragOffset]   = useState(0)
  const [isExpanded, setIsExpanded]   = useState(false)
  const dragStartX = useRef<number | null>(null)
  const dragStartY = useRef<number | null>(null)
  const movedRef   = useRef(false)
  const n = cards.length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isExpanded) {
        if (e.key === 'Escape') setIsExpanded(false)
        return
      }
      if (e.key === 'ArrowRight') setActiveIndex(i => mod(i + 1, n))
      if (e.key === 'ArrowLeft')  setActiveIndex(i => mod(i - 1, n))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isExpanded, n])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartX.current = e.clientX
    dragStartY.current = e.clientY
    movedRef.current   = false
    if (!isExpanded) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return
    const dx = e.clientX - dragStartX.current
    const dy = e.clientY - (dragStartY.current ?? e.clientY)
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) movedRef.current = true
    if (!isExpanded) setDragOffset(dx)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return
    if (!movedRef.current) {
      if (isExpanded) {
        setIsExpanded(false)
      } else {
        const rect    = e.currentTarget.getBoundingClientRect()
        const clickX  = e.clientX - (rect.left + rect.width / 2)
        const slot    = Math.max(-2, Math.min(2, Math.round(clickX / SPACING)))
        const cardIdx = mod(activeIndex + slot, n)
        if (slot === 0) setIsExpanded(true)
        else            setActiveIndex(cardIdx)
      }
    } else if (!isExpanded) {
      if (dragOffset < -80)     setActiveIndex(i => mod(i + 1, n))
      else if (dragOffset > 80) setActiveIndex(i => mod(i - 1, n))
    }
    dragStartX.current = null
    dragStartY.current = null
    setDragOffset(0)
  }

  const onPointerCancel = () => {
    dragStartX.current = null
    dragStartY.current = null
    setDragOffset(0)
  }

  const isLive = dragOffset !== 0

  const rulerTicks = (totalH: number) =>
    Array.from({ length: Math.floor((totalH - 36) / 4) + 1 }, (_, idx) => {
      const y  = 18 + idx * 4
      const w  = idx % 15 === 0 ? 5.5 : idx % 5 === 0 ? 3.5 : 1.5
      const op = idx % 15 === 0 ? 0.65 : idx % 5 === 0 ? 0.5 : 0.3
      return <line key={idx} x1={8 - w} y1={y} x2={8} y2={y} strokeWidth="0.7" strokeOpacity={op} />
    })

  const CardShell = ({ h, children, isCenter: center, correct }: { h: number; children: React.ReactNode; isCenter: boolean; correct: boolean | null }) => {
    const frameColor = correct === false ? 'rgba(176,48,48,0.52)' : FRAME
    const glowFilter = correct === false
      ? 'drop-shadow(0 0 5px rgba(176,48,48,0.60)) drop-shadow(0 0 14px rgba(176,48,48,0.30))'
      : 'drop-shadow(0 0 5px rgba(154,112,24,0.55)) drop-shadow(0 0 14px rgba(154,112,24,0.28))'
    return (
    <div style={{ filter: center ? glowFilter : undefined }}>
      <div style={{ clipPath: CHAMFER, background: frameColor, padding: '1px' }}>
        <div style={{ clipPath: CHAMFER, background: 'var(--bg-card)', height: h, position: 'relative', overflow: 'hidden' }}>
          {/* Magic circle — 1/4 at BR corner */}
          <div style={{
            position: 'absolute', bottom: -204, right: -204,
            width: 408, height: 408,
            opacity: center ? 0.22 : 0.09,
            color: 'var(--gold)', pointerEvents: 'none',
          }}>
            <MagicCircle variant="inner" speed={0.45} />
          </div>
          {/* Ruler */}
          <svg aria-hidden="true"
            style={{ position: 'absolute', top: 0, right: 3, pointerEvents: 'none' }}
            width="11" height={h} fill="none" stroke={ACCENT} strokeLinecap="round"
          >
            <polygon points="5.5,6 8,10 5.5,14 3,10" fill={ACCENT} fillOpacity="0.5" stroke="none" />
            <line x1="8" y1="16" x2="8" y2={h - 18} strokeWidth="0.65" strokeOpacity="0.4" />
            {rulerTicks(h)}
            <polygon points={`5.5,${h - 8} 8,${h - 12} 5.5,${h - 16} 3,${h - 12}`} fill={ACCENT} fillOpacity="0.5" stroke="none" />
          </svg>
          {/* Top accent bar */}
          <div style={{
            position: 'absolute', top: 0, left: '15%', right: '15%',
            height: 2, background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
            pointerEvents: 'none',
          }} />
          {children}
        </div>
      </div>
    </div>
  )}

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div
        style={{
          position: 'relative', width: '100%', height: CARD_H + 60,
          userSelect: 'none',
          cursor: isExpanded ? 'default' : isLive ? 'grabbing' : 'grab',
          overflow: isExpanded ? 'visible' : 'hidden',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {cards.map((card, i) => {
          let rawSlot = i - activeIndex
          if (rawSlot >  n / 2) rawSlot -= n
          if (rawSlot < -n / 2) rawSlot += n

          const slot    = rawSlot - dragOffset / SPACING
          const absSlot = Math.abs(slot)
          if (absSlot > 3) return null

          const isCenter      = rawSlot === 0
          const cardIsExpanded = isCenter && isExpanded

          const baseOpacity = Math.max(0, 1.0 - absSlot * 0.34)
          const scale   = Math.max(0.4, 1.0 - absSlot * 0.215)
          const opacity = isExpanded && !isCenter ? baseOpacity * 0.18 : baseOpacity
          const x       = slot * SPACING
          const zIndex  = cardIsExpanded ? 50 : Math.round(20 - absSlot * 5)
          const symbolColor = card.correct === null ? 'var(--gold-dim)' : card.correct ? '#2a8a3a' : '#b03030'

          return (
            <div
              key={card.question.id}
              style={{
                position: 'absolute', left: '50%', top: '50%',
                width: cardIsExpanded ? EXPANDED_W : CARD_W,
                transform: `translate(calc(-50% + ${x}px), -50%) scale(${scale})`,
                opacity,
                transition: !isLive
                  ? 'transform 0.4s cubic-bezier(0.34,1.2,0.64,1), opacity 0.35s ease, width 0.38s cubic-bezier(0.34,1.2,0.64,1)'
                  : 'none',
                zIndex,
              }}
            >
              <CardShell h={CARD_H} isCenter={isCenter} correct={card.correct}>
                <div style={{ display: 'flex', height: CARD_H }}>

                  {/* Left panel — question identity */}
                  <div style={{
                    width: CARD_W - 2, flexShrink: 0,
                    padding: '18px 14px 14px',
                    display: 'flex', flexDirection: 'column',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, marginBottom: 8 }}>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', color: 'var(--gold-dim)', letterSpacing: '0.18em' }}>
                        {String(card.index + 1).padStart(2, '0')}
                      </span>
                      <span style={{ color: symbolColor, fontSize: '0.88rem', fontWeight: 700, lineHeight: 1 }}>
                        {card.correct === null ? '◈' : card.correct ? '✓' : '✕'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginBottom: 10 }}>
                      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT})` }} />
                      <div style={{ width: 3, height: 3, border: `1px solid ${ACCENT}`, transform: 'rotate(45deg)', flexShrink: 0 }} />
                    </div>

                    <p style={{
                      fontSize: '0.82rem', color: 'var(--ink)', lineHeight: 1.6,
                      margin: 0, flex: 1, overflow: 'hidden',
                      display: '-webkit-box', WebkitLineClamp: 10, WebkitBoxOrient: 'vertical',
                    } as React.CSSProperties}>
                      {questionText(card.question)}
                    </p>

                    {isCenter && !isLive && (
                      <div style={{
                        flexShrink: 0, textAlign: 'center',
                        fontSize: '0.52rem', letterSpacing: '0.22em',
                        fontFamily: 'Cinzel, serif', color: 'var(--gold-dim)',
                        opacity: 0.6, marginTop: 8,
                      }}>
                        {cardIsExpanded ? '✦ TAP TO CLOSE ✦' : '✦ TAP TO REVEAL ✦'}
                      </div>
                    )}
                  </div>

                  {/* Vertical separator */}
                  <div style={{
                    width: 1, flexShrink: 0,
                    background: `linear-gradient(180deg, transparent 5%, ${ACCENT} 22%, ${ACCENT} 78%, transparent 95%)`,
                    opacity: cardIsExpanded ? 0.55 : 0,
                    transition: 'opacity 0.3s 0.18s ease',
                  }} />

                  {/* Right panel — answer detail */}
                  <div style={{
                    flex: 1, minWidth: 0,
                    padding: '16px 20px 14px 14px',
                    overflowY: 'auto',
                    display: 'flex', flexDirection: 'column', gap: 10,
                    opacity: cardIsExpanded ? 1 : 0,
                    transition: 'opacity 0.25s 0.24s ease',
                  }}>
                    {isCenter && <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
                        <TypeTag type={card.question.type} />
                        <DifficultyTag difficulty={card.question.difficulty} />
                        {card.correct !== null && (
                          <span style={{
                            fontFamily: 'Cinzel, serif', fontSize: '0.52rem', letterSpacing: '0.1em',
                            padding: '2px 7px', border: '1px solid',
                            borderColor: card.correct ? 'rgba(42,138,58,0.4)' : 'rgba(176,48,48,0.4)',
                            color: card.correct ? '#2a8a3a' : '#b03030',
                            textTransform: 'uppercase' as const,
                          }}>
                            {card.correct ? '✓ Correct' : '✕ Wrong'}
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <AnswerDetail question={card.question} userAnswer={card.userAnswer} correct={card.correct} />
                      </div>
                    </>}
                  </div>

                </div>
              </CardShell>
            </div>
          )
        })}
      </div>

      {/* Counter */}
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.22em', color: 'var(--gold-dim)' }}>
        {String(activeIndex + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
      </div>
    </div>
  )
}
