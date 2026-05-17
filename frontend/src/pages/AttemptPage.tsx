import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAttempt, useSubmitAttempt } from '../hooks/useAttempts'
import { Passage, Question, QuestionGroup, TestQuestion } from '../types'
import OrnatePanel from '../components/ui/OrnatePanel'
import { TypeTag, DifficultyTag } from '../components/ui/Tag'
import Starfield from '../components/ui/Starfield'

// ── Helpers ────────────────────────────────────────────────────────────────────

function checkAnswer(q: Question, answer: string): boolean {
  const got = answer.trim()
  if (q.choice) {
    const want = [...q.choice.answers].sort()
    const got2 = got.split('|').map(s => s.trim()).filter(Boolean).sort()
    return got2.length === want.length && got2.every((v, i) => v === want[i])
  }
  if (!q.item) return false
  return got.toLowerCase() === q.item.answer.trim().toLowerCase()
}

function questionContent(q: Question): string {
  return q.item?.content ?? q.choice?.content ?? ''
}

function CorrectAnswerBox({ answer }: { answer: string }) {
  return (
    <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(154,112,24,0.04)', border: '1px solid var(--border-dim)', fontSize: '0.88rem' }}>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginBottom: 6 }}>CORRECT ANSWER</div>
      <div style={{ color: '#2a8a3a' }}>{answer}</div>
    </div>
  )
}

// ── Group context (headings / options list) ────────────────────────────────────

function GroupContextBox({ group }: { group: QuestionGroup }) {
  const ctx = group.context
  let label = ''
  let items: { key: string; text: string }[] = []

  if (group.type === 'matching_headings' && ctx.headings?.length) {
    label = 'Headings'; items = ctx.headings
  } else if (group.type === 'matching_features' && ctx.options?.length) {
    label = 'Features'; items = ctx.options
  } else if (group.type === 'matching_information') {
    label = 'Paragraphs'; items = ctx.paragraphs ?? ctx.options ?? []
  }
  if (!items.length) return null

  return (
    <div style={{ marginBottom: 12, padding: '12px 14px', border: '1px solid var(--border-dim)', background: 'var(--bg-panel)' }}>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.14em', color: 'var(--gold-dim)', marginBottom: 8, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map(item => (
          <div key={item.key} style={{ display: 'flex', gap: 10, fontSize: '0.9rem', fontFamily: 'EB Garamond, serif', color: 'var(--ink)' }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', color: 'var(--gold-dim)', minWidth: 22 }}>{item.key}.</span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Answer options (flash-card and passage both use this) ──────────────────────

function AnswerOptions({ q, selected, onSelect, revealed = false }: {
  q: Question; selected: string; onSelect: (v: string) => void; revealed?: boolean
}) {
  const locked = revealed
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

  if (q.type === 'mcq' && q.choice) {
    const correctKeys  = new Set(q.choice.answers)
    const selectedKeys = new Set(selected.split('|').map(s => s.trim()).filter(Boolean))
    const single = q.choice.answers.length === 1
    const toggle = (key: string) => {
      if (locked) return
      if (single) { onSelect(selectedKeys.has(key) ? '' : key) }
      else {
        const next = new Set(selectedKeys)
        next.has(key) ? next.delete(key) : next.add(key)
        onSelect([...next].join('|'))
      }
    }
    return (
      <div className="answer-options">
        {shuffledMCQ.map(opt => {
          const isSel  = selectedKeys.has(opt.key)
          const isCorr = locked && correctKeys.has(opt.key)
          const isWrong = locked && isSel && !correctKeys.has(opt.key)
          return (
            <button key={opt.key} className={`answer-option ${!locked && isSel ? 'selected' : ''}`}
              onClick={() => toggle(opt.key)}
              style={{ cursor: locked ? 'default' : 'pointer', borderColor: isCorr ? 'rgba(42,138,58,0.6)' : isWrong ? 'rgba(176,48,48,0.6)' : undefined, background: isCorr ? 'rgba(42,138,58,0.08)' : isWrong ? 'rgba(176,48,48,0.06)' : undefined }}>
              <span className="answer-key">{opt.key}</span>
              <span className="answer-text">{opt.text}</span>
              {isCorr && <span style={{ marginLeft: 'auto', color: '#2a8a3a', fontSize: '0.8rem' }}>✓</span>}
            </button>
          )
        })}
      </div>
    )
  }

  if (q.type === 'tf_ng' || q.type === 'yn_ng') {
    const opts = q.type === 'tf_ng' ? ['True', 'False', 'Not Given'] : ['Yes', 'No', 'Not Given']
    const correct = q.item?.answer ?? ''
    return (
      <div className="answer-options" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        {opts.map(val => {
          const isCorr  = locked && val.toLowerCase() === correct.toLowerCase()
          const isWrong = locked && val === selected && !isCorr
          return (
            <button key={val} className={`answer-option ${!locked && selected === val ? 'selected' : ''}`}
              onClick={() => !locked && onSelect(val === selected ? '' : val)}
              style={{ justifyContent: 'center', cursor: locked ? 'default' : 'pointer', borderColor: isCorr ? 'rgba(42,138,58,0.6)' : isWrong ? 'rgba(176,48,48,0.6)' : undefined, background: isCorr ? 'rgba(42,138,58,0.08)' : isWrong ? 'rgba(176,48,48,0.06)' : undefined }}>
              <span className="answer-text" style={{ textAlign: 'center' }}>{val}</span>
              {isCorr && <span style={{ marginLeft: 8, color: '#2a8a3a' }}>✓</span>}
            </button>
          )
        })}
      </div>
    )
  }

  if (q.type === 'sentence_completion' || q.type === 'form_completion') {
    const parts = questionContent(q).split('___')
    const correct = q.item?.answer ?? ''
    const isCorr = locked && selected.trim().toLowerCase() === correct.trim().toLowerCase()
    const col = locked ? (isCorr ? 'rgba(42,138,58,0.7)' : 'rgba(176,48,48,0.7)') : 'var(--gold-dim)'
    return (
      <div style={{ width: '100%' }}>
        <p style={{ fontSize: '1.1rem', lineHeight: 2, color: 'var(--ink)', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0 4px' }}>
          {parts.map((part, i) => (
            <span key={i} style={{ display: 'contents' }}>
              <span>{part}</span>
              {i < parts.length - 1 && (
                <input type="text" value={selected} onChange={e => !locked && onSelect(e.target.value)} readOnly={locked}
                  style={{ display: 'inline-block', minWidth: 120, width: `${Math.max(selected.length, correct.length, 10) * 0.68}ch`, background: 'transparent', border: 'none', borderBottom: `2px solid ${col}`, outline: 'none', fontSize: '1.1rem', color: locked ? col : 'var(--ink)', padding: '0 4px', textAlign: 'center', fontFamily: 'inherit' }}
                  placeholder="…" />
              )}
            </span>
          ))}
        </p>
        {locked && !isCorr && <CorrectAnswerBox answer={correct} />}
      </div>
    )
  }

  if (q.type === 'matching_headings' && ctx?.headings?.length) {
    const correct = q.item?.answer ?? ''
    const isCorr  = locked && selected.trim().toLowerCase() === correct.trim().toLowerCase()
    return (
      <div style={{ width: '100%' }}>
        <select value={selected} disabled={locked} onChange={e => !locked && onSelect(e.target.value)} className="form-input"
          style={{ cursor: locked ? 'default' : 'pointer', color: locked ? (isCorr ? '#2a8a3a' : '#b03030') : selected ? 'var(--ink)' : 'var(--ink-dim)', borderColor: locked ? (isCorr ? 'rgba(42,138,58,0.5)' : 'rgba(176,48,48,0.5)') : undefined }}>
          <option value="">— Select a heading —</option>
          {ctx.headings.map(h => <option key={h.key} value={h.text}>{h.key}. {h.text}</option>)}
        </select>
        {locked && !isCorr && <CorrectAnswerBox answer={correct} />}
      </div>
    )
  }

  if ((q.type === 'matching_features' || q.type === 'matching_information') && (ctx?.options?.length || ctx?.paragraphs?.length)) {
    const opts    = ctx?.options ?? ctx?.paragraphs ?? []
    const correct = q.item?.answer ?? ''
    const isCorr  = locked && selected.trim().toLowerCase() === correct.trim().toLowerCase()
    const corrLabel = opts.find(o => o.key.toLowerCase() === correct.toLowerCase())
    return (
      <div style={{ width: '100%' }}>
        <select value={selected} disabled={locked} onChange={e => !locked && onSelect(e.target.value)} className="form-input"
          style={{ cursor: locked ? 'default' : 'pointer', color: locked ? (isCorr ? '#2a8a3a' : '#b03030') : selected ? 'var(--ink)' : 'var(--ink-dim)', borderColor: locked ? (isCorr ? 'rgba(42,138,58,0.5)' : 'rgba(176,48,48,0.5)') : undefined }}>
          <option value="">— Select —</option>
          {opts.map(o => <option key={o.key} value={o.key}>{o.key}. {o.text}</option>)}
        </select>
        {locked && !isCorr && <CorrectAnswerBox answer={`${correct}${corrLabel ? ` — ${corrLabel.text}` : ''}`} />}
      </div>
    )
  }

  const correct = q.item?.answer ?? ''
  const isCorr  = locked && selected.trim().toLowerCase() === correct.trim().toLowerCase()
  return (
    <div style={{ width: '100%' }}>
      <input type="text" className="form-input" value={selected} onChange={e => !locked && onSelect(e.target.value)} readOnly={locked}
        placeholder="Your answer…"
        style={{ borderColor: locked ? (isCorr ? 'rgba(42,138,58,0.6)' : 'rgba(176,48,48,0.6)') : undefined, color: locked ? (isCorr ? '#2a8a3a' : '#b03030') : undefined }} />
      {locked && !isCorr && <CorrectAnswerBox answer={correct} />}
    </div>
  )
}

// ── Passage body ──────────────────────────────────────────────────────────────

function PassageBody({ passage }: { passage: Passage }) {
  const paragraphs = passage.paragraphs

  if (paragraphs && paragraphs.length > 0) {
    return (
      <div style={{ fontFamily: 'EB Garamond, serif', fontSize: '1rem', lineHeight: 1.9, color: 'var(--ink)' }}>
        {paragraphs.map((para, i) => (
          <p key={i} style={{ marginBottom: 18, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            {para.label && (
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', fontWeight: 700, color: 'var(--gold-dim)', minWidth: 18, paddingTop: 4, flexShrink: 0 }}>
                {para.label}
              </span>
            )}
            <span>{para.text}</span>
          </p>
        ))}
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'EB Garamond, serif', fontSize: '1rem', lineHeight: 1.9, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
      {passage.body}
    </div>
  )
}

// ── Passage layout — all questions at once ─────────────────────────────────────

interface GroupedSection {
  groupId: number
  group: QuestionGroup
  items: TestQuestion[]
}

function PassageAttemptLayout({ attempt, questions, answers, setAnswers, onSubmit, isPending }: {
  attempt: any
  questions: TestQuestion[]
  answers: Record<string, string>
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onSubmit: () => void
  isPending: boolean
}) {
  const passage = useMemo(() =>
    questions.find(tq => tq.question?.group?.passage)?.question?.group?.passage,
  [questions])

  const sections: GroupedSection[] = useMemo(() => {
    const map = new Map<number, GroupedSection>()
    questions.forEach(tq => {
      const q = tq.question
      if (!q?.group_id) return
      if (!map.has(q.group_id)) map.set(q.group_id, { groupId: q.group_id, group: q.group!, items: [] })
      map.get(q.group_id)!.items.push(tq)
    })
    return [...map.values()]
      .map(s => ({ ...s, items: [...s.items].sort((a, b) => a.position - b.position) }))
      .sort((a, b) => Math.min(...a.items.map(t => t.position)) - Math.min(...b.items.map(t => t.position)))
  }, [questions])

  const answered = Object.values(answers).filter(Boolean).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Starfield />

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-panel)' }}>
        <div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'var(--ink)' }}>{attempt.test.name}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--ink-dim)', marginTop: 2 }}>
            {answered} / {questions.length} answered
          </div>
        </div>
        <button className="btn btn-primary" onClick={onSubmit} disabled={isPending} style={{ padding: '10px 28px' }}>
          {isPending ? '…' : 'Submit All →'}
        </button>
      </div>

      {/* Two panels */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

        {/* Left — passage body */}
        <div style={{ overflowY: 'auto', padding: '24px 28px', borderRight: '1px solid var(--border-dim)' }}>
          {passage && (
            <>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.68rem', letterSpacing: '0.14em', color: 'var(--gold-dim)', marginBottom: 12, textTransform: 'uppercase' }}>
                Passage
              </div>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: 'var(--ink)', marginBottom: 18, lineHeight: 1.4 }}>
                {passage.title}
              </h2>
              <PassageBody passage={passage} />
            </>
          )}
        </div>

        {/* Right — all questions */}
        <div style={{ overflowY: 'auto', padding: '24px 28px' }}>
          {sections.map(({ groupId, group, items }) => (
            <div key={groupId} style={{ marginBottom: 32 }}>
              <GroupContextBox group={group} />
              {items.map((tq) => {
                const q = tq.question!
                const sel = answers[String(q.id)] ?? ''
                return (
                  <div key={q.id} style={{ marginBottom: 18 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.8rem', color: 'var(--gold-dim)', minWidth: 28, paddingTop: 2 }}>
                        {tq.position}.
                      </span>
                      <p style={{ flex: 1, margin: 0, fontFamily: 'EB Garamond, serif', fontSize: '1rem', color: 'var(--ink)', lineHeight: 1.5 }}>
                        {questionContent(q)}
                      </p>
                    </div>
                    <div style={{ paddingLeft: 40 }}>
                      <AnswerOptions q={q} selected={sel} onSelect={val => setAnswers(prev => ({ ...prev, [String(q.id)]: val }))} />
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
          <div style={{ height: 40 }} />
        </div>
      </div>
    </div>
  )
}

// ── Flash-card layout (standalone) ────────────────────────────────────────────

function FlashCardLayout({ attempt, questions, setAnswers, onFinish, isPending }: {
  attempt: any
  questions: TestQuestion[]
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onFinish: () => void
  isPending: boolean
}) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected,   setSelected]   = useState('')
  const [revealed,   setRevealed]   = useState(false)
  const [score,      setScore]      = useState(0)
  const [scorable,   setScorable]   = useState(0)

  const total  = questions.length
  const tq     = questions[currentIdx]
  const q      = tq?.question
  const isLast = currentIdx === total - 1

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
    if (isLast) { onFinish(); return }
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
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'var(--ink)' }}>{attempt.test.name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--ink-dim)', marginTop: 2 }}>Question {currentIdx + 1} / {total}</div>
          </div>
          {scorable > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.4rem', color: 'var(--gold)', lineHeight: 1 }}>
                {score}<span style={{ fontSize: '0.85rem', color: 'var(--ink-dim)', marginLeft: 2 }}>/ {scorable}</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--ink-dim)', letterSpacing: '0.12em', fontFamily: 'Cinzel, serif' }}>SCORE</div>
            </div>
          )}
        </div>

        <div className="attempt-body">
          <div className="w-full" style={{ maxWidth: 720 }}>
            {passage && (
              <div style={{ marginBottom: 14, padding: '12px 16px', border: '1px solid var(--border-dim)', background: 'var(--bg-panel)', fontSize: '0.88rem', color: 'var(--ink-dim)', fontFamily: 'Cinzel, serif', letterSpacing: '0.06em' }}>
                Passage: {passage.title}
              </div>
            )}
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
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.56rem', letterSpacing: '0.1em', padding: '2px 8px', border: '1px solid', borderColor: isCorrect ? 'rgba(42,138,58,0.5)' : 'rgba(176,48,48,0.5)', color: isCorrect ? '#2a8a3a' : '#b03030', textTransform: 'uppercase' }}>
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
                <button className="btn btn-primary" onClick={handleReveal} disabled={!selected} style={{ padding: '10px 32px' }}>Submit</button>
              ) : (
                <button className="btn btn-primary pulse" onClick={handleNext} disabled={isPending} style={{ padding: '10px 32px' }}>
                  {isPending ? '…' : isLast ? 'Finish →' : 'Next →'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function AttemptPage() {
  const { id = '' }       = useParams<{ id: string }>()
  const navigate          = useNavigate()
  const { data: attempt } = useAttempt(id)
  const submit            = useSubmitAttempt()
  const [answers, setAnswers] = useState<Record<string, string>>({})

  if (!attempt?.test) return (
    <div className="attempt-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Starfield />
      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.8rem', color: 'var(--ink-dim)', letterSpacing: '0.2em' }}>Loading…</span>
    </div>
  )

  const questions  = attempt.test.questions ?? []
  const total      = questions.length

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

  const isPassageTest = questions.some(tq => !!tq.question?.group?.passage_id)

  const handleSubmit = async () => {
    await submit.mutateAsync({ id, answers })
    navigate(`/attempts/${id}/results`)
  }

  if (isPassageTest) {
    return (
      <PassageAttemptLayout
        attempt={attempt}
        questions={questions}
        answers={answers}
        setAnswers={setAnswers}
        onSubmit={handleSubmit}
        isPending={submit.isPending}
      />
    )
  }

  return (
    <FlashCardLayout
      attempt={attempt}
      questions={questions}
      setAnswers={setAnswers}
      onFinish={handleSubmit}
      isPending={submit.isPending}
    />
  )
}
