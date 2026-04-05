import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAttempt, useSubmitAttempt } from '../hooks/useAttempts'
import { TestQuestion } from '../types'
import OrnatePanel from '../components/ui/OrnatePanel'
import { TypeTag, DifficultyTag } from '../components/ui/Tag'
import Starfield from '../components/ui/Starfield'

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function AttemptPage() {
  const { id = '' }       = useParams<{ id: string }>()
  const navigate          = useNavigate()
  const { data: attempt } = useAttempt(id)
  const submit            = useSubmitAttempt()

  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected,   setSelected]   = useState<string>('')
  const [revealed,   setRevealed]   = useState(false)
  // answers accumulated for final submit
  const [answers,    setAnswers]     = useState<Record<string, string>>({})
  // running score: only counts non-open questions
  const [score,      setScore]       = useState(0)
  // how many non-open questions have been answered
  const [scorable,   setScorable]    = useState(0)

  if (!attempt?.test) return (
    <div className="attempt-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Starfield />
      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.8rem', color: 'var(--ink-dim)', letterSpacing: '0.2em' }}>Loading…</span>
    </div>
  )

  const questions: TestQuestion[] = attempt.test.questions ?? []
  const total     = questions.length
  const tq        = questions[currentIdx]
  const q         = tq?.question
  const isLast    = currentIdx === total - 1
  const isOpen    = q?.type === 'open'
  const isCorrect = revealed && !isOpen && selected === q?.correct_answer

  const handleReveal = () => {
    if (!q || !selected) return
    const next = { ...answers, [q.id]: selected }
    setAnswers(next)
    setRevealed(true)
    if (!isOpen) {
      setScorable(s => s + 1)
      if (selected === q.correct_answer) setScore(s => s + 1)
    }
  }

  const handleNext = async () => {
    if (isLast) {
      await submit.mutateAsync({ id, answers })
      navigate(`/attempts/${id}/results`)
      return
    }
    setCurrentIdx(i => i + 1)
    setSelected('')
    setRevealed(false)
  }

  const handleOptionClick = (val: string) => {
    if (revealed) return
    setSelected(prev => prev === val ? '' : val)
  }

  if (!q) return null

  const progress = ((currentIdx + (revealed ? 1 : 0)) / total) * 100

  return (
    <>
      <Starfield />
      <div className="attempt-layout">
        {/* Progress bar */}
        <div className="attempt-progress-bar">
          <div className="attempt-progress-fill" style={{ width: `${progress}%`, transition: 'width 0.4s ease' }} />
        </div>

        {/* Header */}
        <div className="attempt-header">
          <div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'var(--ink)' }}>
              {attempt.test.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--ink-dim)', marginTop: 2 }}>
              Question {currentIdx + 1} / {total}
            </div>
          </div>
          {/* Running score */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.4rem', color: 'var(--gold)', lineHeight: 1 }}>
              {score}
              <span style={{ fontSize: '0.85rem', color: 'var(--ink-dim)', marginLeft: 2 }}>/ {scorable}</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--ink-dim)', letterSpacing: '0.12em', fontFamily: 'Cinzel, serif' }}>
              SCORE
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="attempt-body">
          <div className="w-full" style={{ maxWidth: 720 }}>
            <OrnatePanel style={{ marginBottom: 14 } as React.CSSProperties}>
              <div className="flex items-start gap-4">
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: 'var(--gold-dim)', paddingTop: 2, minWidth: 32 }}>
                  {String(currentIdx + 1).padStart(2, '0')}
                </span>
                <div style={{ flex: 1 }}>
                  <p className="question-text">{q.text}</p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <TypeTag type={q.type} />
                    <DifficultyTag difficulty={q.difficulty} />
                    {revealed && !isOpen && (
                      <span style={{
                        fontFamily: 'Cinzel, serif', fontSize: '0.56rem', letterSpacing: '0.1em',
                        padding: '2px 8px', border: '1px solid',
                        borderColor: isCorrect ? 'rgba(42,138,58,0.5)' : 'rgba(176,48,48,0.5)',
                        color: isCorrect ? '#2a8a3a' : '#b03030',
                        textTransform: 'uppercase',
                      }}>
                        {isCorrect ? '✓ Correct' : '✕ Wrong'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </OrnatePanel>

            {/* MCQ */}
            {q.type === 'mcq' && (
              <div className="answer-options">
                {(q.options ?? []).map((opt, i) => {
                  const isCorrectOpt = revealed && opt === q.correct_answer
                  const isWrongSel   = revealed && opt === selected && opt !== q.correct_answer
                  return (
                    <button
                      key={i}
                      className={`answer-option ${!revealed && selected === opt ? 'selected' : ''}`}
                      onClick={() => handleOptionClick(opt)}
                      style={{
                        cursor: revealed ? 'default' : 'pointer',
                        borderColor: isCorrectOpt ? 'rgba(42,138,58,0.6)' : isWrongSel ? 'rgba(176,48,48,0.6)' : undefined,
                        background:  isCorrectOpt ? 'rgba(42,138,58,0.08)' : isWrongSel ? 'rgba(176,48,48,0.06)' : undefined,
                      }}
                    >
                      <span className="answer-key">{OPTION_KEYS[i]}</span>
                      <span className="answer-text">{opt}</span>
                      {isCorrectOpt && <span style={{ marginLeft: 'auto', color: '#2a8a3a', fontSize: '0.8rem' }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {/* True / False */}
            {q.type === 'true_false' && (
              <div className="answer-options" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {(q.options?.length ? q.options : ['True', 'False']).map(val => {
                  const isCorrectOpt = revealed && val === q.correct_answer
                  const isWrongSel   = revealed && val === selected && val !== q.correct_answer
                  return (
                    <button
                      key={val}
                      className={`answer-option ${!revealed && selected === val ? 'selected' : ''}`}
                      onClick={() => handleOptionClick(val)}
                      style={{
                        justifyContent: 'center', cursor: revealed ? 'default' : 'pointer',
                        borderColor: isCorrectOpt ? 'rgba(42,138,58,0.6)' : isWrongSel ? 'rgba(176,48,48,0.6)' : undefined,
                        background:  isCorrectOpt ? 'rgba(42,138,58,0.08)' : isWrongSel ? 'rgba(176,48,48,0.06)' : undefined,
                      }}
                    >
                      <span className="answer-text" style={{ textAlign: 'center' }}>{val}</span>
                      {isCorrectOpt && <span style={{ marginLeft: 8, color: '#2a8a3a', fontSize: '0.8rem' }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Open */}
            {q.type === 'open' && (
              <div style={{ width: '100%' }}>
                <textarea
                  className="form-input"
                  rows={6}
                  style={{ fontSize: '1.1rem' }}
                  placeholder="Write your answer…"
                  value={selected}
                  onChange={e => { if (!revealed) setSelected(e.target.value) }}
                  readOnly={revealed}
                />
                {revealed && (
                  <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(154,112,24,0.04)', border: '1px solid var(--border-dim)', fontSize: '0.88rem' }}>
                    <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginBottom: 6 }}>REFERENCE ANSWER</div>
                    <div style={{ color: 'var(--ink)' }}>{q.correct_answer}</div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              {!revealed ? (
                <button
                  className="btn btn-primary"
                  onClick={handleReveal}
                  disabled={!selected}
                  style={{ padding: '10px 32px' }}
                >
                  Submit
                </button>
              ) : (
                <button
                  className="btn btn-primary pulse"
                  onClick={handleNext}
                  disabled={submit.isPending}
                  style={{ padding: '10px 32px' }}
                >
                  {submit.isPending ? '…' : isLast ? '⚔ Finish' : 'Next →'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
