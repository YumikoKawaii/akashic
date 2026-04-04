import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAttempt } from '../hooks/useAttempts'
import { useSubmitAttempt } from '../hooks/useAttempts'
import { TestQuestion } from '../types'
import OrnatePanel from '../components/ui/OrnatePanel'
import { TypeTag, DifficultyTag } from '../components/ui/Tag'
import Starfield from '../components/ui/Starfield'

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function AttemptPage() {
  const { id = '' }  = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const { data: attempt } = useAttempt(id)
  const submit       = useSubmitAttempt()
  const [answers, setAnswers] = useState<Record<string, string>>({})

  if (!attempt?.test) return (
    <div className="attempt-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Starfield />
      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.8rem', color: 'var(--ink-dim)', letterSpacing: '0.2em' }}>Loading…</span>
    </div>
  )

  const questions: TestQuestion[] = attempt.test.questions ?? []
  const answered   = Object.keys(answers).length
  const progress   = questions.length > 0 ? (answered / questions.length) * 100 : 0

  const handleAnswer = (questionId: string, value: string) =>
    setAnswers(prev => {
      if (prev[questionId] === value) {
        const next = { ...prev }
        delete next[questionId]
        return next
      }
      return { ...prev, [questionId]: value }
    })

  const handleSubmit = async () => {
    await submit.mutateAsync({ id, answers })
    navigate(`/attempts/${id}/results`)
  }

  return (
    <>
      <Starfield />
      <div className="attempt-layout">
        {/* Progress bar */}
        <div className="attempt-progress-bar">
          <div className="attempt-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Header */}
        <div className="attempt-header">
          <div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'var(--ink)' }}>
              {attempt.test.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--ink-dim)', marginTop: 2 }}>
              {answered} / {questions.length} answered
            </div>
          </div>
          <button
            className="btn btn-primary pulse"
            onClick={handleSubmit}
            disabled={submit.isPending}
          >
            {submit.isPending ? '…' : '⚔ Submit Answers'}
          </button>
        </div>

        {/* Questions */}
        <div className="attempt-body">
          {questions.map((tq, idx) => {
            const q = tq.question
            if (!q) return null
            const selected = answers[q.id]

            return (
              <div key={q.id} className="w-full" style={{ maxWidth: 720 }}>
                {/* Question panel */}
                <OrnatePanel style={{ marginBottom: 14 } as React.CSSProperties}>
                  <div className="flex items-start gap-4">
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', color: 'var(--gold-dim)', paddingTop: 2, minWidth: 28 }}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p className="question-text">{q.text}</p>
                      <div className="flex gap-2 mt-3">
                        <TypeTag type={q.type} />
                        <DifficultyTag difficulty={q.difficulty} />
                      </div>
                    </div>
                  </div>
                </OrnatePanel>

                {/* MCQ options — FGO command card style */}
                {q.type === 'mcq' && (
                  <div className="answer-options">
                    {(q.options ?? []).map((opt, i) => (
                      <button
                        key={i}
                        className={`answer-option ${selected === opt ? 'selected' : ''}`}
                        onClick={() => handleAnswer(q.id, opt)}
                      >
                        <span className="answer-key">{OPTION_KEYS[i]}</span>
                        <span className="answer-text">{opt}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* True / False */}
                {q.type === 'true_false' && (
                  <div className="answer-options" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    {(q.options?.length ? q.options : ['True', 'False']).map(val => (
                      <button
                        key={val}
                        className={`answer-option ${selected === val ? 'selected' : ''}`}
                        onClick={() => handleAnswer(q.id, val)}
                        style={{ justifyContent: 'center' }}
                      >
                        <span className="answer-text" style={{ textAlign: 'center' }}>{val}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Open */}
                {q.type === 'open' && (
                  <div style={{ maxWidth: 720, width: '100%' }}>
                    <textarea
                      className="form-input"
                      rows={4}
                      placeholder="Write your answer…"
                      value={selected ?? ''}
                      onChange={e => handleAnswer(q.id, e.target.value)}
                    />
                  </div>
                )}
              </div>
            )
          })}

          {/* Submit at bottom */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              className="btn btn-primary pulse"
              onClick={handleSubmit}
              disabled={submit.isPending}
              style={{ padding: '12px 40px' }}
            >
              {submit.isPending ? '…' : '⚔ Submit Answers'}
            </button>
            <button className="btn btn-ghost" onClick={() => navigate(-1)}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
