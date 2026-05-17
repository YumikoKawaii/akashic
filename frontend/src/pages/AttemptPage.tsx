import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAttempt, useSubmitAttempt } from '../hooks/useAttempts'
import { Question, QuestionGroup } from '../types'
import OrnatePanel from '../components/ui/OrnatePanel'
import { TypeTag, DifficultyTag } from '../components/ui/Tag'
import Starfield from '../components/ui/Starfield'

// ── Answer checking ────────────────────────────────────────────────────────────

function checkAnswer(q: Question, answer: string): boolean {
  const got = answer.trim()
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
    case 'short_answer':
    case 'tf_ng':
    case 'yn_ng':
      return got.toLowerCase() === want.toLowerCase()
    default:
      return got.toLowerCase() === want.toLowerCase()
  }
}

function questionContent(q: Question): string {
  return q.item?.content ?? q.choice?.content ?? ''
}

// ── Passage panel ──────────────────────────────────────────────────────────────

function PassagePanel({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      width: '100%', maxWidth: 720, marginBottom: 14,
      border: '1px solid var(--border-dim)', background: 'var(--bg-card)',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'Cinzel, serif', fontSize: '0.72rem', letterSpacing: '0.12em',
          color: 'var(--gold-dim)', textTransform: 'uppercase',
        }}
      >
        <span>Passage — {title}</span>
        <span style={{ transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {open && (
        <div style={{
          padding: '0 16px 16px',
          maxHeight: 360, overflowY: 'auto',
          borderTop: '1px solid var(--border-dim)',
          fontSize: '0.95rem', lineHeight: 1.8,
          color: 'var(--ink)', fontFamily: 'EB Garamond, serif',
          whiteSpace: 'pre-wrap',
        }}>
          {body}
        </div>
      )}
    </div>
  )
}

// ── Group context box ──────────────────────────────────────────────────────────

function GroupContextBox({ group }: { group: QuestionGroup }) {
  const ctx = group.context
  const items: { key: string; text: string }[] = []
  let label = ''

  if (group.type === 'matching_headings' && ctx.headings?.length) {
    label = 'Headings'
    items.push(...ctx.headings)
  } else if ((group.type === 'matching_features' || group.type === 'matching_information') && ctx.options?.length) {
    label = group.type === 'matching_information' ? 'Paragraphs' : 'Features'
    items.push(...ctx.options)
  } else if (group.type === 'matching_information' && ctx.paragraphs?.length) {
    label = 'Paragraphs'
    items.push(...ctx.paragraphs)
  }

  if (!items.length) return null

  return (
    <div style={{
      width: '100%', maxWidth: 720, marginBottom: 10,
      border: '1px solid var(--border-dim)', background: 'var(--bg-panel)',
      padding: '12px 16px',
    }}>
      <div style={{
        fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.14em',
        color: 'var(--gold-dim)', marginBottom: 8, textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map(item => (
          <div key={item.key} style={{ display: 'flex', gap: 10, fontSize: '0.9rem', fontFamily: 'EB Garamond, serif', color: 'var(--ink)' }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', color: 'var(--gold-dim)', minWidth: 24, paddingTop: 2 }}>{item.key}.</span>
            <span style={{ lineHeight: 1.5 }}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Answer options ─────────────────────────────────────────────────────────────

function AnswerOptions({ q, selected, onSelect, revealed }: {
  q: Question
  selected: string
  onSelect: (val: string) => void
  revealed?: boolean
}) {
  const locked = !!revealed
  const ctx    = q.group?.context

  const shuffledMCQ = useMemo(() => {
    if (!q.choice) return []
    const opts = [...q.choice.options]
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]]
    }
    return opts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.id])

  // MCQ ────────────────────────────────────────────────────────────────────────
  if (q.type === 'mcq' && q.choice) {
    const correctKeys  = new Set(q.choice.answers)
    const selectedKeys = new Set(selected.split('|').map(s => s.trim()).filter(Boolean))
    const isSingleAnswer = q.choice.answers.length === 1

    const toggleKey = (key: string) => {
      if (locked) return
      if (isSingleAnswer) {
        onSelect(selectedKeys.has(key) ? '' : key)
      } else {
        const next = new Set(selectedKeys)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        onSelect([...next].join('|'))
      }
    }

    return (
      <div className="answer-options">
        {shuffledMCQ.map(opt => {
          const isSel        = selectedKeys.has(opt.key)
          const isCorrectOpt = locked && correctKeys.has(opt.key)
          const isWrongSel   = locked && isSel && !correctKeys.has(opt.key)
          return (
            <button
              key={opt.key}
              className={`answer-option ${!locked && isSel ? 'selected' : ''}`}
              onClick={() => toggleKey(opt.key)}
              style={{
                cursor: locked ? 'default' : 'pointer',
                borderColor: isCorrectOpt ? 'rgba(42,138,58,0.6)' : isWrongSel ? 'rgba(176,48,48,0.6)' : undefined,
                background:  isCorrectOpt ? 'rgba(42,138,58,0.08)' : isWrongSel ? 'rgba(176,48,48,0.06)' : undefined,
              }}
            >
              <span className="answer-key">{opt.key}</span>
              <span className="answer-text">{opt.text}</span>
              {isCorrectOpt && <span style={{ marginLeft: 'auto', color: '#2a8a3a', fontSize: '0.8rem' }}>✓</span>}
            </button>
          )
        })}
      </div>
    )
  }

  // T/F/NG ─────────────────────────────────────────────────────────────────────
  if (q.type === 'tf_ng') {
    const opts    = ['True', 'False', 'Not Given'] as const
    const correct = q.item?.answer ?? ''
    return (
      <div className="answer-options" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        {opts.map(val => {
          const isCorrectOpt = locked && val.toLowerCase() === correct.toLowerCase()
          const isWrongSel   = locked && val === selected && !isCorrectOpt
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

  // Y/N/NG ─────────────────────────────────────────────────────────────────────
  if (q.type === 'yn_ng') {
    const opts    = ['Yes', 'No', 'Not Given'] as const
    const correct = q.item?.answer ?? ''
    return (
      <div className="answer-options" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        {opts.map(val => {
          const isCorrectOpt = locked && val.toLowerCase() === correct.toLowerCase()
          const isWrongSel   = locked && val === selected && !isCorrectOpt
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

  // Sentence / Form completion ──────────────────────────────────────────────────
  if (q.type === 'sentence_completion' || q.type === 'form_completion') {
    const parts   = questionContent(q).split('___')
    const correct = q.item?.answer ?? ''
    const isCorrect = locked && selected.trim().toLowerCase() === correct.trim().toLowerCase()
    const inputColor = locked ? (isCorrect ? 'rgba(42,138,58,0.7)' : 'rgba(176,48,48,0.7)') : 'var(--gold-dim)'
    return (
      <div style={{ width: '100%' }}>
        <p style={{ fontSize: '1.1rem', lineHeight: 2, color: 'var(--ink)', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0 4px' }}>
          {parts.map((part, i) => (
            <span key={i} style={{ display: 'contents' }}>
              <span>{part}</span>
              {i < parts.length - 1 && (
                <input
                  type="text"
                  value={selected}
                  onChange={e => !locked && onSelect(e.target.value)}
                  readOnly={locked}
                  autoFocus={i === 0}
                  style={{
                    display: 'inline-block',
                    minWidth: 120,
                    width: `${Math.max(selected.length, correct.length, 10) * 0.68}ch`,
                    background: 'transparent', border: 'none',
                    borderBottom: `2px solid ${inputColor}`,
                    outline: 'none', fontSize: '1.1rem',
                    color: locked ? inputColor : 'var(--ink)',
                    padding: '0 4px', textAlign: 'center',
                    fontFamily: 'inherit', transition: 'border-color 0.2s, color 0.2s',
                  }}
                  placeholder="…"
                />
              )}
            </span>
          ))}
        </p>
        {locked && !isCorrect && <CorrectAnswerBox answer={correct} />}
      </div>
    )
  }

  // Matching — dropdown when context available ──────────────────────────────────
  if (q.type === 'matching_headings' && ctx?.headings?.length) {
    const headings  = ctx.headings
    const correct   = q.item?.answer ?? ''
    const isCorrect = locked && selected.trim().toLowerCase() === correct.trim().toLowerCase()
    return (
      <div style={{ width: '100%' }}>
        <select
          value={selected}
          disabled={locked}
          onChange={e => !locked && onSelect(e.target.value)}
          className="form-input"
          style={{
            cursor: locked ? 'default' : 'pointer',
            color: locked ? (isCorrect ? '#2a8a3a' : '#b03030') : selected ? 'var(--ink)' : 'var(--ink-dim)',
            borderColor: locked ? (isCorrect ? 'rgba(42,138,58,0.5)' : 'rgba(176,48,48,0.5)') : undefined,
          }}
        >
          <option value="">— Select a heading —</option>
          {headings.map(h => (
            <option key={h.key} value={h.text}>{h.key}. {h.text}</option>
          ))}
        </select>
        {locked && !isCorrect && <CorrectAnswerBox answer={correct} />}
      </div>
    )
  }

  if ((q.type === 'matching_features' || q.type === 'matching_information') &&
      (ctx?.options?.length || ctx?.paragraphs?.length)) {
    const opts      = ctx?.options ?? ctx?.paragraphs ?? []
    const correct   = q.item?.answer ?? ''
    const isCorrect = locked && selected.trim().toLowerCase() === correct.trim().toLowerCase()
    const correctLabel = opts.find(o => o.key.toLowerCase() === correct.toLowerCase())
    return (
      <div style={{ width: '100%' }}>
        <select
          value={selected}
          disabled={locked}
          onChange={e => !locked && onSelect(e.target.value)}
          className="form-input"
          style={{
            cursor: locked ? 'default' : 'pointer',
            color: locked ? (isCorrect ? '#2a8a3a' : '#b03030') : selected ? 'var(--ink)' : 'var(--ink-dim)',
            borderColor: locked ? (isCorrect ? 'rgba(42,138,58,0.5)' : 'rgba(176,48,48,0.5)') : undefined,
          }}
        >
          <option value="">— Select —</option>
          {opts.map(o => (
            <option key={o.key} value={o.key}>{o.key}. {o.text}</option>
          ))}
        </select>
        {locked && !isCorrect && <CorrectAnswerBox answer={`${correct}${correctLabel ? ` — ${correctLabel.text}` : ''}`} />}
      </div>
    )
  }

  // Short answer / fallback text input ──────────────────────────────────────────
  const correct   = q.item?.answer ?? ''
  const isCorrect = locked && selected.trim().toLowerCase() === correct.trim().toLowerCase()
  return (
    <div style={{ width: '100%' }}>
      <input
        type="text"
        className="form-input"
        value={selected}
        onChange={e => !locked && onSelect(e.target.value)}
        readOnly={locked}
        placeholder="Your answer…"
        style={{ borderColor: locked ? (isCorrect ? 'rgba(42,138,58,0.6)' : 'rgba(176,48,48,0.6)') : undefined, color: locked ? (isCorrect ? '#2a8a3a' : '#b03030') : undefined }}
      />
      {locked && !isCorrect && <CorrectAnswerBox answer={correct} />}
    </div>
  )
}

function CorrectAnswerBox({ answer }: { answer: string }) {
  return (
    <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(154,112,24,0.04)', border: '1px solid var(--border-dim)', fontSize: '0.88rem' }}>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginBottom: 6 }}>CORRECT ANSWER</div>
      <div style={{ color: '#2a8a3a' }}>{answer}</div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function AttemptPage() {
  const { id = '' }       = useParams<{ id: string }>()
  const navigate          = useNavigate()
  const { data: attempt } = useAttempt(id)
  const submit            = useSubmitAttempt()

  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected,   setSelected]   = useState('')
  const [revealed,   setRevealed]   = useState(false)
  const [answers,    setAnswers]     = useState<Record<string, string>>({})
  const [score,      setScore]       = useState(0)
  const [scorable,   setScorable]    = useState(0)

  if (!attempt?.test) return (
    <div className="attempt-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Starfield />
      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.8rem', color: 'var(--ink-dim)', letterSpacing: '0.2em' }}>Loading…</span>
    </div>
  )

  const questions = attempt.test.questions ?? []
  const total     = questions.length

  if (total === 0) return (
    <div className="attempt-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Starfield />
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'var(--ink)' }}>No Questions</div>
        <div style={{ fontSize: '0.88rem', color: 'var(--ink-dim)' }}>This test was generated with no matching questions.</div>
        <button className="btn btn-primary" onClick={() => navigate(-1)} style={{ padding: '10px 28px' }}>Go Back</button>
      </div>
    </div>
  )

  const tq         = questions[currentIdx]
  const q          = tq?.question
  const isLast     = currentIdx === total - 1

  if (!q) return null

  const group      = q.group
  const passage    = group?.passage
  const content    = questionContent(q)
  const isScoreable = q.type !== 'short_answer'
  const isCorrect  = revealed && isScoreable && checkAnswer(q, selected)
  const progress   = ((currentIdx + (revealed ? 1 : 0)) / total) * 100

  const handleReveal = () => {
    if (!selected) return
    setAnswers(prev => ({ ...prev, [String(q.id)]: selected }))
    setRevealed(true)
    if (isScoreable) {
      setScorable(s => s + 1)
      if (checkAnswer(q, selected)) setScore(s => s + 1)
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
          {scorable > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.4rem', color: 'var(--gold)', lineHeight: 1 }}>
                {score}
                <span style={{ fontSize: '0.85rem', color: 'var(--ink-dim)', marginLeft: 2 }}>/ {scorable}</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--ink-dim)', letterSpacing: '0.12em', fontFamily: 'Cinzel, serif' }}>
                SCORE
              </div>
            </div>
          )}
        </div>

        <div className="attempt-body">
          <div className="w-full" style={{ maxWidth: 720 }}>

            {passage && <PassagePanel title={passage.title} body={passage.body} />}

            {group && <GroupContextBox group={group} />}

            <OrnatePanel style={{ marginBottom: 14 } as React.CSSProperties}>
              <div className="flex items-start gap-4">
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: 'var(--gold-dim)', paddingTop: 2, minWidth: 32 }}>
                  {String(currentIdx + 1).padStart(2, '0')}
                </span>
                <div style={{ flex: 1 }}>
                  <p className="question-text">{content}</p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <TypeTag type={q.type} />
                    <DifficultyTag difficulty={q.difficulty} />
                    {revealed && isScoreable && (
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
                  {submit.isPending ? '…' : isLast ? 'Finish →' : 'Next →'}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
