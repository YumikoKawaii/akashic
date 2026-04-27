import { useParams, useNavigate } from 'react-router-dom'
import { useAttempt } from '../hooks/useAttempts'
import OrnatePanel from '../components/ui/OrnatePanel'
import { TypeTag, DifficultyTag } from '../components/ui/Tag'
import OrnateDivider from '../components/ui/OrnateDivider'
import Starfield from '../components/ui/Starfield'
import { TestQuestion, Passage } from '../types'

function groupByPassage(questions: TestQuestion[]) {
  const groups: { passage: Passage | null; items: { tq: TestQuestion; idx: number }[] }[] = []
  questions.forEach((tq, idx) => {
    const passage = tq.question?.passage ?? null
    const passageId = passage?.id ?? null
    const last = groups[groups.length - 1]
    if (last && (last.passage?.id ?? null) === passageId) {
      last.items.push({ tq, idx })
    } else {
      groups.push({ passage, items: [{ tq, idx }] })
    }
  })
  return groups
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

  const score   = attempt.score  ?? 0
  const total   = attempt.total  ?? 0
  const pct     = total > 0 ? Math.round((score / total) * 100) : 0
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
          {/* Score */}
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

          {/* Per-question review */}
          <div className="section-title" style={{ width: '100%', maxWidth: 720 }}>Answer Review</div>
          <div className="flex flex-col gap-4" style={{ width: '100%', maxWidth: 720 }}>
            {groupByPassage(questions).map((group, gi) => (
              <div key={gi}>
                {group.passage && (
                  <div style={{
                    marginBottom: 12,
                    padding: '14px 20px',
                    background: 'rgba(154,112,24,0.04)',
                    border: '1px solid var(--border-dim)',
                    borderLeft: '3px solid var(--gold-dim)',
                  }}>
                    <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: 8, textTransform: 'uppercase' }}>
                      {group.passage.title}
                    </div>
                    <p style={{ fontSize: '0.92rem', lineHeight: 1.75, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                      {group.passage.body}
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {group.items.map(({ tq, idx }) => {
                    const q       = tq.question
                    if (!q) return null
                    const userAns = attempt.answers?.[q.id]
                    const isOpen  = q.type === 'open'
                    const sortPipe = (s: string) => s.split('|').map(x => x.trim()).filter(Boolean).sort().join('|')
                    const correct = isOpen ? null
                      : q.type === 'sentence_completion'
                        ? (userAns ?? '').trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
                      : q.type === 'multi_select'
                        ? sortPipe(userAns ?? '') === sortPipe(q.correct_answer)
                        : userAns === q.correct_answer
                    const options = q.options ?? []

                    return (
                      <div
                        key={q.id}
                        className="q-card"
                        style={{
                          borderColor: isOpen ? 'var(--border-dim)' : correct ? 'rgba(42,138,58,0.4)' : 'rgba(176,48,48,0.4)',
                          animationDelay: `${idx * 0.04}s`,
                          cursor: 'default',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.68rem', color: 'var(--gold-dim)', paddingTop: 2, minWidth: 24 }}>
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '0.95rem', color: 'var(--ink)', marginBottom: 10 }}>{q.text}</p>
                            <div className="flex gap-2 flex-wrap mb-3">
                              <TypeTag type={q.type} />
                              <DifficultyTag difficulty={q.difficulty} />
                              {!isOpen && (
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

                            {q.type === 'mcq' && (
                              <div className="flex flex-col gap-2">
                                {options.map((opt, i) => {
                                  const isCorrect  = opt === q.correct_answer
                                  const isSelected = opt === userAns
                                  return (
                                    <div key={i} style={{
                                      padding: '8px 12px', border: '1px solid',
                                      borderColor: isCorrect ? 'rgba(42,138,58,0.5)' : isSelected ? 'rgba(176,48,48,0.5)' : 'var(--border-dim)',
                                      background: isCorrect ? 'rgba(42,138,58,0.06)' : isSelected ? 'rgba(176,48,48,0.06)' : 'transparent',
                                      fontSize: '0.88rem', color: 'var(--ink)',
                                      display: 'flex', gap: 10, alignItems: 'center',
                                    }}>
                                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.68rem', color: 'var(--gold-dim)', minWidth: 16 }}>
                                        {['A','B','C','D','E','F'][i]}
                                      </span>
                                      {opt}
                                      {isCorrect && <span style={{ marginLeft: 'auto', color: '#2a8a3a', fontSize: '0.8rem' }}>✓</span>}
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {(q.type === 'true_false' || q.type === 'tf_ng') && (
                              <div style={{ fontSize: '0.88rem', color: 'var(--ink-dim)' }}>
                                Your answer: <strong style={{ color: correct ? '#2a8a3a' : '#b03030' }}>{userAns ?? '—'}</strong>
                                {' · '}Correct: <strong style={{ color: '#2a8a3a' }}>{q.correct_answer}</strong>
                              </div>
                            )}

                            {q.type === 'sentence_completion' && (() => {
                              const parts = q.text.split('___')
                              return (
                                <div style={{ fontSize: '0.95rem', lineHeight: 1.9, color: 'var(--ink)' }}>
                                  {parts.map((part, i) => (
                                    <span key={i}>
                                      {part}
                                      {i < parts.length - 1 && (
                                        <span style={{
                                          display: 'inline-block',
                                          padding: '0 8px',
                                          borderBottom: `2px solid ${correct ? 'rgba(42,138,58,0.7)' : 'rgba(176,48,48,0.7)'}`,
                                          color: correct ? '#2a8a3a' : '#b03030',
                                          fontWeight: 600,
                                          minWidth: 60,
                                          textAlign: 'center',
                                        }}>
                                          {userAns || '—'}
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                  {!correct && (
                                    <div style={{ marginTop: 6, fontSize: '0.82rem', color: 'var(--ink-dim)' }}>
                                      Correct: <strong style={{ color: '#2a8a3a' }}>{q.correct_answer}</strong>
                                    </div>
                                  )}
                                </div>
                              )
                            })()}

                            {q.type === 'word_bank_completion' && (() => {
                              const parts = q.text.split('___')
                              return (
                                <div style={{ fontSize: '0.95rem', lineHeight: 1.9, color: 'var(--ink)' }}>
                                  {parts.map((part, i) => (
                                    <span key={i}>
                                      {part}
                                      {i < parts.length - 1 && (
                                        <span style={{
                                          display: 'inline-block',
                                          padding: '2px 10px',
                                          border: `1px solid ${correct ? 'rgba(42,138,58,0.5)' : 'rgba(176,48,48,0.5)'}`,
                                          borderRadius: 4,
                                          background: correct ? 'rgba(42,138,58,0.06)' : 'rgba(176,48,48,0.06)',
                                          color: correct ? '#2a8a3a' : '#b03030',
                                          fontWeight: 600,
                                          minWidth: 60,
                                          textAlign: 'center',
                                          margin: '0 4px',
                                        }}>
                                          {userAns || '—'}
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                  {!correct && (
                                    <div style={{ marginTop: 6, fontSize: '0.82rem', color: 'var(--ink-dim)' }}>
                                      Correct: <strong style={{ color: '#2a8a3a' }}>{q.correct_answer}</strong>
                                    </div>
                                  )}
                                </div>
                              )
                            })()}

                            {q.type === 'matching' && (
                              <div style={{ fontSize: '0.88rem', color: 'var(--ink-dim)' }}>
                                Your answer: <strong style={{ color: correct ? '#2a8a3a' : '#b03030' }}>{userAns ?? '—'}</strong>
                                {' · '}Correct: <strong style={{ color: '#2a8a3a' }}>{q.correct_answer}</strong>
                              </div>
                            )}

                            {q.type === 'multi_select' && (() => {
                              const selectedSet = new Set((userAns ?? '').split('|').map(s => s.trim()).filter(Boolean))
                              const correctSet  = new Set(q.correct_answer.split('|').map(s => s.trim()).filter(Boolean))
                              return (
                                <div className="flex flex-col gap-2">
                                  {options.map((opt, i) => {
                                    const isSel     = selectedSet.has(opt)
                                    const isCorrect = correctSet.has(opt)
                                    const highlight = isSel && isCorrect ? 'correct'
                                      : isSel && !isCorrect ? 'wrong'
                                      : !isSel && isCorrect ? 'missed'
                                      : 'neutral'
                                    return (
                                      <div key={i} style={{
                                        padding: '8px 12px', border: '1px solid',
                                        borderColor: highlight === 'correct' ? 'rgba(42,138,58,0.5)'
                                          : highlight === 'wrong'    ? 'rgba(176,48,48,0.5)'
                                          : highlight === 'missed'   ? 'rgba(42,138,58,0.3)'
                                          : 'var(--border-dim)',
                                        background: highlight === 'correct' ? 'rgba(42,138,58,0.06)'
                                          : highlight === 'wrong'    ? 'rgba(176,48,48,0.06)'
                                          : highlight === 'missed'   ? 'rgba(42,138,58,0.03)'
                                          : 'transparent',
                                        fontSize: '0.88rem', color: 'var(--ink)',
                                        display: 'flex', gap: 10, alignItems: 'center',
                                      }}>
                                        <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.68rem', color: 'var(--gold-dim)', minWidth: 16 }}>
                                          {['A','B','C','D','E','F'][i]}
                                        </span>
                                        {opt}
                                        {highlight === 'correct' && <span style={{ marginLeft: 'auto', color: '#2a8a3a', fontSize: '0.8rem' }}>✓</span>}
                                        {highlight === 'wrong'   && <span style={{ marginLeft: 'auto', color: '#b03030', fontSize: '0.8rem' }}>✕</span>}
                                        {highlight === 'missed'  && <span style={{ marginLeft: 'auto', color: '#2a8a3a', fontSize: '0.75rem', opacity: 0.8 }}>missed</span>}
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })()}

                            {isOpen && (
                              <div style={{ background: 'rgba(154,112,24,0.04)', border: '1px solid var(--border-dim)', padding: '10px 14px', fontSize: '0.9rem', color: 'var(--ink)' }}>
                                {userAns || <span style={{ color: 'var(--ink-dim)', fontStyle: 'italic' }}>No answer provided</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: 40 }} />
        </div>
      </div>
    </>
  )
}
