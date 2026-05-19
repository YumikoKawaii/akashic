import { useEffect } from 'react'
import { TypeTag, DifficultyTag } from '../ui/Tag'
import { CardData } from './QuestionCarousel'

interface Props {
  card: CardData
  onClose: () => void
}

export default function QuestionDetailModal({ card, onClose }: Props) {
  const { question: q, userAnswer, correct, index } = card
  const content = q.item?.content ?? q.choice?.content ?? ''

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const glowRgba  = correct === null ? 'rgba(154,112,24,0.25)' : correct ? 'rgba(42,138,58,0.25)' : 'rgba(176,48,48,0.25)'
  const rimColor  = correct === null ? 'rgba(154,112,24,0.4)'  : correct ? 'rgba(42,138,58,0.4)'  : 'rgba(176,48,48,0.4)'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(8,6,2,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backdropFilter: 'blur(5px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: `1px solid ${rimColor}`,
          boxShadow: `0 0 48px ${glowRgba}, 0 12px 60px rgba(0,0,0,0.45)`,
          padding: '36px 40px',
          maxWidth: 660,
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14, right: 16,
            background: 'none',
            border: 'none',
            color: 'var(--gold-dim)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontFamily: 'Cinzel, serif',
            letterSpacing: '0.1em',
            padding: '4px 8px',
            opacity: 0.75,
          }}
        >
          ✕ ESC
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.62rem', color: 'var(--gold-dim)', letterSpacing: '0.18em' }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <div style={{ width: 1, height: 14, background: 'var(--border-dim)', flexShrink: 0 }} />
          <TypeTag type={q.type} />
          <DifficultyTag difficulty={q.difficulty} />
          {correct !== null && (
            <span style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '0.56rem',
              letterSpacing: '0.1em',
              padding: '2px 8px',
              border: '1px solid',
              borderColor: correct ? 'rgba(42,138,58,0.4)' : 'rgba(176,48,48,0.4)',
              color: correct ? '#2a8a3a' : '#b03030',
              textTransform: 'uppercase' as const,
            }}>
              {correct ? '✓ Correct' : '✕ Wrong'}
            </span>
          )}
        </div>

        {/* Question text */}
        <p style={{ fontSize: '1rem', color: 'var(--ink)', marginBottom: 22, lineHeight: 1.75 }}>
          {content}
        </p>

        {/* MCQ options */}
        {q.choice && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {q.choice.options.map(opt => {
              const isCorrectOpt = q.choice!.answers.includes(opt.key)
              const isSelected   = userAnswer?.split('|').map(s => s.trim()).includes(opt.key) ?? false
              return (
                <div key={opt.key} style={{
                  padding: '9px 14px',
                  border: '1px solid',
                  borderColor: isCorrectOpt ? 'rgba(42,138,58,0.5)' : isSelected ? 'rgba(176,48,48,0.5)' : 'var(--border-dim)',
                  background: isCorrectOpt ? 'rgba(42,138,58,0.06)' : isSelected ? 'rgba(176,48,48,0.06)' : 'transparent',
                  fontSize: '0.88rem',
                  color: 'var(--ink)',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                }}>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.68rem', color: 'var(--gold-dim)', minWidth: 16 }}>
                    {opt.key}
                  </span>
                  {opt.text}
                  {isCorrectOpt && <span style={{ marginLeft: 'auto', color: '#2a8a3a', fontSize: '0.8rem' }}>✓</span>}
                </div>
              )
            })}
          </div>
        )}

        {/* tf_ng / yn_ng / matching types */}
        {q.item && ['tf_ng','yn_ng','matching_headings','matching_information','matching_features'].includes(q.type) && (
          <div style={{ fontSize: '0.9rem', color: 'var(--ink-dim)', lineHeight: 2 }}>
            Your answer:{' '}
            <strong style={{ color: correct ? '#2a8a3a' : '#b03030' }}>{userAnswer ?? '—'}</strong>
            {'  ·  '}
            Correct:{' '}
            <strong style={{ color: '#2a8a3a' }}>{q.item.answer}</strong>
          </div>
        )}

        {/* sentence_completion / form_completion */}
        {q.item && ['sentence_completion','form_completion'].includes(q.type) && (() => {
          const parts = content.split('___')
          return (
            <div style={{ fontSize: '0.95rem', lineHeight: 2, color: 'var(--ink)' }}>
              {parts.map((part, pi) => (
                <span key={pi}>
                  {part}
                  {pi < parts.length - 1 && (
                    <span style={{
                      display: 'inline-block',
                      padding: '0 10px',
                      borderBottom: `2px solid ${correct ? 'rgba(42,138,58,0.7)' : 'rgba(176,48,48,0.7)'}`,
                      color: correct ? '#2a8a3a' : '#b03030',
                      fontWeight: 600,
                      minWidth: 64,
                      textAlign: 'center',
                    }}>
                      {userAnswer || '—'}
                    </span>
                  )}
                </span>
              ))}
              {!correct && (
                <div style={{ marginTop: 6, fontSize: '0.82rem', color: 'var(--ink-dim)' }}>
                  Correct: <strong style={{ color: '#2a8a3a' }}>{q.item!.answer}</strong>
                </div>
              )}
            </div>
          )
        })()}

        {/* short_answer */}
        {q.item && q.type === 'short_answer' && (
          <div style={{ background: 'rgba(154,112,24,0.04)', border: '1px solid var(--border-dim)', padding: '12px 16px', fontSize: '0.9rem' }}>
            <div style={{ color: 'var(--ink-dim)', fontSize: '0.72rem', marginBottom: 4 }}>Your answer</div>
            <div style={{ color: 'var(--ink)' }}>
              {userAnswer || <span style={{ fontStyle: 'italic', color: 'var(--ink-dim)' }}>No answer provided</span>}
            </div>
            <div style={{ color: 'var(--ink-dim)', fontSize: '0.72rem', marginTop: 10, marginBottom: 4 }}>Reference answer</div>
            <div style={{ color: '#2a8a3a' }}>{q.item.answer}</div>
          </div>
        )}
      </div>
    </div>
  )
}
