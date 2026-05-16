import { useParams, useNavigate } from 'react-router-dom'
import { useAttempt } from '../hooks/useAttempts'
import { Question } from '../types'
import OrnatePanel from '../components/ui/OrnatePanel'
import { TypeTag, DifficultyTag } from '../components/ui/Tag'
import OrnateDivider from '../components/ui/OrnateDivider'
import Starfield from '../components/ui/Starfield'

function questionContent(q: Question): string {
  return q.item?.content ?? q.choice?.content ?? ''
}

function isCorrectAnswer(q: Question, userAns: string | undefined): boolean | null {
  if (!userAns) return false
  if (q.type === 'short_answer') return null // not auto-scored
  const got = userAns.trim()
  if (q.choice) {
    const want = [...q.choice.answers].sort()
    const got2 = got.split('|').map(s => s.trim()).filter(Boolean).sort()
    return got2.length === want.length && got2.every((v, i) => v === want[i])
  }
  if (!q.item) return false
  const want = q.item.answer.trim()
  switch (q.type) {
    case 'sentence_completion':
    case 'form_completion':
    case 'tf_ng':
    case 'yn_ng':
      return got.toLowerCase() === want.toLowerCase()
    default:
      return got === want
  }
}

export default function ResultsPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const { data: attempt } = useAttempt(id)

  if (!attempt?.test) return (
    <div className="attempt-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Starfield />
      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.8rem', color: 'var(--ink-dim)', letterSpacing: '0.2em' }}>Loading…</span>
    </div>
  )

  const score     = attempt.score  ?? 0
  const total     = attempt.total  ?? 0
  const pct       = total > 0 ? Math.round((score / total) * 100) : 0
  const questions = attempt.test.questions ?? []

  const grade = pct >= 90 ? 'S' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 45 ? 'C' : 'D'
  const gradeColor = { S: '#c89030', A: '#2a8a3a', B: '#3a60c0', C: '#b8942a', D: '#b03030' }[grade]

  return (
    <>
      <Starfield />
      <div className="attempt-layout">
        <div className="attempt-header">
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'var(--ink)' }}>
            {attempt.test.name} — Results
          </div>
          <div className="flex gap-3">
            <button className="btn btn-ghost" onClick={() => navigate(`/banks/${attempt.test!.bank_id}`)}>
              ← Back to Bank
            </button>
          </div>
        </div>

        <div className="attempt-body">
          <OrnatePanel style={{ textAlign: 'center', padding: '40px 60px' } as React.CSSProperties}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', letterSpacing: '0.3em', color: 'var(--gold-dim)', textTransform: 'uppercase', marginBottom: 16 }}>
              Final Score
            </div>
            <div className="results-score" style={{ color: gradeColor }}>
              {score}<span style={{ fontSize: '2.5rem', color: 'var(--ink-dim)' }}>/{total}</span>
            </div>
            <div style={{ marginTop: 12, fontFamily: 'Cinzel, serif', fontSize: '2rem', color: gradeColor, textShadow: `0 0 20px ${gradeColor}40` }}>
              {grade}
            </div>
            <div style={{ marginTop: 8, color: 'var(--ink-dim)', fontSize: '0.9rem' }}>
              {pct}% correct
            </div>
          </OrnatePanel>

          <OrnateDivider />

          <div className="section-title" style={{ width: '100%', maxWidth: 720 }}>Answer Review</div>
          <div className="flex flex-col gap-4" style={{ width: '100%', maxWidth: 720 }}>
            {questions.map((entry, gi) => {
              const q = entry?.question
              if (!q) return null
              const userAns = attempt.answers?.[String(q.id)]
              const correct = isCorrectAnswer(q, userAns)
              const content = questionContent(q)

              return (
                <div
                  key={q.id}
                  className="q-card"
                  style={{
                    borderColor: correct === null ? 'var(--border-dim)' : correct ? 'rgba(42,138,58,0.4)' : 'rgba(176,48,48,0.4)',
                    animationDelay: `${gi * 0.04}s`,
                    cursor: 'default',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.68rem', color: 'var(--gold-dim)', paddingTop: 2, minWidth: 24 }}>
                      {String(gi + 1).padStart(2, '0')}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.95rem', color: 'var(--ink)', marginBottom: 10 }}>{content}</p>
                      <div className="flex gap-2 flex-wrap mb-3">
                        <TypeTag type={q.type} />
                        <DifficultyTag difficulty={q.difficulty} />
                        {correct !== null && (
                          <span style={{
                            fontFamily: 'Cinzel, serif', fontSize: '0.56rem', letterSpacing: '0.1em',
                            padding: '2px 8px', border: '1px solid',
                            borderColor: correct ? 'rgba(42,138,58,0.4)' : 'rgba(176,48,48,0.4)',
                            color: correct ? '#2a8a3a' : '#b03030',
                            textTransform: 'uppercase',
                          }}>
                            {correct ? '✓ Correct' : '✕ Wrong'}
                          </span>
                        )}
                      </div>

                      {q.choice && (
                        <div className="flex flex-col gap-2">
                          {q.choice.options.map(opt => {
                            const isCorrectOpt = q.choice!.answers.includes(opt.key)
                            const isSelected   = userAns?.split('|').map(s => s.trim()).includes(opt.key) ?? false
                            return (
                              <div key={opt.key} style={{
                                padding: '8px 12px', border: '1px solid',
                                borderColor: isCorrectOpt ? 'rgba(42,138,58,0.5)' : isSelected ? 'rgba(176,48,48,0.5)' : 'var(--border-dim)',
                                background: isCorrectOpt ? 'rgba(42,138,58,0.06)' : isSelected ? 'rgba(176,48,48,0.06)' : 'transparent',
                                fontSize: '0.88rem', color: 'var(--ink)',
                                display: 'flex', gap: 10, alignItems: 'center',
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

                      {q.item && (q.type === 'tf_ng' || q.type === 'yn_ng' || q.type === 'matching_headings' || q.type === 'matching_information' || q.type === 'matching_features') && (
                        <div style={{ fontSize: '0.88rem', color: 'var(--ink-dim)' }}>
                          Your answer: <strong style={{ color: correct ? '#2a8a3a' : '#b03030' }}>{userAns ?? '—'}</strong>
                          {' · '}Correct: <strong style={{ color: '#2a8a3a' }}>{q.item.answer}</strong>
                        </div>
                      )}

                      {q.item && (q.type === 'sentence_completion' || q.type === 'form_completion') && (() => {
                        const parts = content.split('___')
                        return (
                          <div style={{ fontSize: '0.95rem', lineHeight: 1.9, color: 'var(--ink)' }}>
                            {parts.map((part, i) => (
                              <span key={i}>
                                {part}
                                {i < parts.length - 1 && (
                                  <span style={{
                                    display: 'inline-block', padding: '0 8px',
                                    borderBottom: `2px solid ${correct ? 'rgba(42,138,58,0.7)' : 'rgba(176,48,48,0.7)'}`,
                                    color: correct ? '#2a8a3a' : '#b03030',
                                    fontWeight: 600, minWidth: 60, textAlign: 'center',
                                  }}>
                                    {userAns || '—'}
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

                      {q.item && q.type === 'short_answer' && (
                        <div style={{ background: 'rgba(154,112,24,0.04)', border: '1px solid var(--border-dim)', padding: '10px 14px', fontSize: '0.9rem' }}>
                          <div style={{ color: 'var(--ink-dim)', fontSize: '0.75rem', marginBottom: 4 }}>Your answer</div>
                          <div style={{ color: 'var(--ink)' }}>
                            {userAns || <span style={{ fontStyle: 'italic', color: 'var(--ink-dim)' }}>No answer provided</span>}
                          </div>
                          <div style={{ color: 'var(--ink-dim)', fontSize: '0.75rem', marginTop: 8, marginBottom: 4 }}>Reference answer</div>
                          <div style={{ color: '#2a8a3a' }}>{q.item.answer}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ height: 40 }} />
        </div>
      </div>
    </>
  )
}
