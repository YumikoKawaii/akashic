import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAttempt, useSubmitAttempt } from '../hooks/useAttempts'
import { Passage, TestQuestion } from '../types'
import OrnatePanel from '../components/ui/OrnatePanel'
import { TypeTag, DifficultyTag } from '../components/ui/Tag'
import Starfield from '../components/ui/Starfield'

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F']

// ── Shared answer options renderer ────────────────────────────────────────────

function AnswerOptions({ q, selected, onSelect, revealed }: {
  q: NonNullable<TestQuestion['question']>
  selected: string
  onSelect: (val: string) => void
  revealed?: boolean
}) {
  const locked = !!revealed

  if (q.type === 'mcq') return (
    <div className="answer-options">
      {(q.options ?? []).map((opt, i) => {
        const isCorrectOpt = locked && opt === q.correct_answer
        const isWrongSel   = locked && opt === selected && opt !== q.correct_answer
        return (
          <button
            key={i}
            className={`answer-option ${!locked && selected === opt ? 'selected' : ''}`}
            onClick={() => !locked && onSelect(opt === selected ? '' : opt)}
            style={{
              cursor: locked ? 'default' : 'pointer',
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
  )

  if (q.type === 'true_false') {
    const opts = q.options?.length ? q.options : ['True', 'False']
    return (
      <div className="answer-options" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {opts.map(val => {
          const isCorrectOpt = locked && val === q.correct_answer
          const isWrongSel   = locked && val === selected && val !== q.correct_answer
          return (
            <button key={val}
              className={`answer-option ${!locked && selected === val ? 'selected' : ''}`}
              onClick={() => !locked && onSelect(val === selected ? '' : val)}
              style={{
                justifyContent: 'center', cursor: locked ? 'default' : 'pointer',
                borderColor: isCorrectOpt ? 'rgba(42,138,58,0.6)' : isWrongSel ? 'rgba(176,48,48,0.6)' : undefined,
                background:  isCorrectOpt ? 'rgba(42,138,58,0.08)' : isWrongSel ? 'rgba(176,48,48,0.06)' : undefined,
              }}
            >
              <span className="answer-text" style={{ textAlign: 'center' }}>{val}</span>
              {isCorrectOpt && <span style={{ marginLeft: 8, color: '#2a8a3a' }}>✓</span>}
            </button>
          )
        })}
      </div>
    )
  }

  if (q.type === 'tf_ng') return (
    <div className="answer-options" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
      {(['True', 'False', 'Not Given'] as const).map(val => {
        const isCorrectOpt = locked && val === q.correct_answer
        const isWrongSel   = locked && val === selected && val !== q.correct_answer
        return (
          <button key={val}
            className={`answer-option ${!locked && selected === val ? 'selected' : ''}`}
            onClick={() => !locked && onSelect(val === selected ? '' : val)}
            style={{
              justifyContent: 'center', cursor: locked ? 'default' : 'pointer',
              borderColor: isCorrectOpt ? 'rgba(42,138,58,0.6)' : isWrongSel ? 'rgba(176,48,48,0.6)' : undefined,
              background:  isCorrectOpt ? 'rgba(42,138,58,0.08)' : isWrongSel ? 'rgba(176,48,48,0.06)' : undefined,
            }}
          >
            <span className="answer-text" style={{ textAlign: 'center' }}>{val}</span>
            {isCorrectOpt && <span style={{ marginLeft: 8, color: '#2a8a3a' }}>✓</span>}
          </button>
        )
      })}
    </div>
  )

  // open
  return (
    <div style={{ width: '100%' }}>
      <textarea
        className="form-input"
        rows={6}
        style={{ fontSize: '1.1rem' }}
        placeholder="Write your answer…"
        value={selected}
        onChange={e => !locked && onSelect(e.target.value)}
        readOnly={locked}
      />
      {locked && (
        <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(154,112,24,0.04)', border: '1px solid var(--border-dim)', fontSize: '0.88rem' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginBottom: 6 }}>REFERENCE ANSWER</div>
          <div style={{ color: 'var(--ink)' }}>{q.correct_answer}</div>
        </div>
      )}
    </div>
  )
}

// ── Group helpers ─────────────────────────────────────────────────────────────

function groupByPassage(questions: TestQuestion[]) {
  const groups: { passage: Passage; items: TestQuestion[] }[] = []
  for (const tq of questions) {
    const p = tq.question?.passage
    if (!p) continue
    const last = groups[groups.length - 1]
    if (last?.passage.id === p.id) last.items.push(tq)
    else groups.push({ passage: p, items: [tq] })
  }
  return groups
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AttemptPage() {
  const { id = '' }       = useParams<{ id: string }>()
  const navigate          = useNavigate()
  const { data: attempt } = useAttempt(id)
  const submit            = useSubmitAttempt()

  // Step-through state
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected,   setSelected]   = useState<string>('')
  const [revealed,   setRevealed]   = useState(false)
  const [answers,    setAnswers]     = useState<Record<string, string>>({})
  const [score,      setScore]       = useState(0)
  const [scorable,   setScorable]    = useState(0)

  // Passage mode state
  const [passageAnswers, setPassageAnswers] = useState<Record<string, string>>({})

  if (!attempt?.test) return (
    <div className="attempt-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Starfield />
      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.8rem', color: 'var(--ink-dim)', letterSpacing: '0.2em' }}>Loading…</span>
    </div>
  )

  const questions: TestQuestion[] = attempt.test.questions ?? []
  const isPassageMode = questions.length > 0 && questions.every(tq => !!tq.question?.passage_id)

  // ── Passage mode ────────────────────────────────────────────────────────────

  if (isPassageMode) {
    const groups    = groupByPassage(questions)
    const total     = questions.length
    const answered  = Object.keys(passageAnswers).length
    const progress  = total > 0 ? (answered / total) * 100 : 0

    const handleSubmit = async () => {
      await submit.mutateAsync({ id, answers: passageAnswers })
      navigate(`/attempts/${id}/results`)
    }

    return (
      <>
        <Starfield />
        <div className="attempt-layout">
          <div className="attempt-progress-bar">
            <div className="attempt-progress-fill" style={{ width: `${progress}%`, transition: 'width 0.3s ease' }} />
          </div>

          <div className="attempt-header">
            <div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'var(--ink)' }}>
                {attempt.test.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--ink-dim)', marginTop: 2 }}>
                {answered} / {total} answered
              </div>
            </div>
            <button
              className="btn btn-primary pulse"
              onClick={handleSubmit}
              disabled={submit.isPending}
              style={{ padding: '8px 24px' }}
            >
              {submit.isPending ? '…' : '⚔ Submit All'}
            </button>
          </div>

          <div className="attempt-body">
            {groups.map((group, gi) => (
              <div key={group.passage.id} style={{ width: '100%', maxWidth: 860 }}>
                {/* Passage text */}
                <div style={{
                  marginBottom: 24,
                  padding: '24px 28px',
                  background: 'rgba(154,112,24,0.04)',
                  border: '1px solid var(--border-dim)',
                  borderLeft: '3px solid var(--gold-dim)',
                }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: 14, textTransform: 'uppercase' }}>
                    Passage {gi + 1} · {group.passage.title}
                  </div>
                  <p style={{ fontSize: '1.05rem', lineHeight: 1.85, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                    {group.passage.body}
                  </p>
                </div>

                {/* Questions */}
                <div className="flex flex-col gap-6" style={{ marginBottom: 48 }}>
                  {group.items.map((tq) => {
                    const q = tq.question
                    if (!q) return null
                    const sel = passageAnswers[q.id] ?? ''
                    const globalIdx = questions.findIndex(x => x.question_id === tq.question_id)
                    return (
                      <div key={q.id}>
                        <OrnatePanel style={{ marginBottom: 12 } as React.CSSProperties}>
                          <div className="flex items-start gap-4">
                            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: 'var(--gold-dim)', paddingTop: 2, minWidth: 32 }}>
                              {String(globalIdx + 1).padStart(2, '0')}
                            </span>
                            <div style={{ flex: 1 }}>
                              <p className="question-text">{q.text}</p>
                              <div className="flex gap-2 mt-3">
                                <TypeTag type={q.type} />
                              </div>
                            </div>
                          </div>
                        </OrnatePanel>
                        <AnswerOptions
                          q={q}
                          selected={sel}
                          onSelect={val => setPassageAnswers(prev => ({ ...prev, [q.id]: val }))}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            <button
              className="btn btn-primary pulse"
              onClick={handleSubmit}
              disabled={submit.isPending}
              style={{ padding: '12px 48px', marginBottom: 32 }}
            >
              {submit.isPending ? '…' : '⚔ Submit All'}
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── Step-through mode ───────────────────────────────────────────────────────

  const total     = questions.length
  const tq        = questions[currentIdx]
  const q         = tq?.question
  const isLast    = currentIdx === total - 1
  const isOpen    = q?.type === 'open'
  const isCorrect = revealed && !isOpen && selected === q?.correct_answer

  const handleReveal = () => {
    if (!q || !selected) return
    setAnswers(prev => ({ ...prev, [q.id]: selected }))
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

  if (!q) return null

  const progress = ((currentIdx + (revealed ? 1 : 0)) / total) * 100

  return (
    <>
      <Starfield />
      <div className="attempt-layout">
        <div className="attempt-progress-bar">
          <div className="attempt-progress-fill" style={{ width: `${progress}%`, transition: 'width 0.4s ease' }} />
        </div>

        <div className="attempt-header">
          <div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'var(--ink)' }}>
              {attempt.test.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--ink-dim)', marginTop: 2 }}>
              Question {currentIdx + 1} / {total}
            </div>
          </div>
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

            <AnswerOptions q={q} selected={selected} onSelect={setSelected} revealed={revealed} />

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
