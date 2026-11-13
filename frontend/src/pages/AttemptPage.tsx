import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useAttempt, useSubmitAttempt, useSaveAttemptProgress } from '../hooks/useAttempts'
import { Question, QuestionGroup, TestQuestion } from '../types'
import { TypeTag, DifficultyTag } from '../components/ui/Tag'
import Spinner from '../components/ui/Spinner'
import OrnateDivider from '../components/ui/OrnateDivider'
import Select from '../components/ui/Select'
import { questionContent, seededShuffle, checkAnswer } from '../components/tests/answers'


function CorrectAnswerBox({ answer }: { answer: string }) {
  return (
    <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(163,34,45,0.04)', border: '1px solid var(--border-dim)', fontSize: '0.88rem' }}>
      <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.8rem', color: 'var(--gold-dim)', marginBottom: 6 }}>Correct answer</div>
      <div style={{ color: '#1F7A72' }}>{answer}</div>
    </div>
  )
}

// ── Question navigator ───────────────────────────────────────────────────────
// Every question as a small orb — hollow when untouched, lit + glowing once
// answered, brightest at the one you're on. onJump receives the question's index.

// Wrapping grid of orbs — used by the passage layout, where every question is
// already laid out below and the orbs are just a jump aid.
function QuestionNavigator({ questions, answers, currentId, onJump }: {
  questions: TestQuestion[]
  answers: Record<string, string>
  currentId?: number
  onJump: (idx: number) => void
}) {
  return (
    <div className="attempt-nav">
      {questions.map((tq, i) => {
        const q = tq.question
        if (!q) return null
        const answered = !!answers[String(q.id)]?.trim()
        const current  = q.id === currentId
        return (
          <button
            key={q.id}
            className={`q-orb${answered ? ' answered' : ''}${current ? ' current' : ''}`}
            onClick={() => onJump(i)}
            title={`Question ${tq.position || i + 1}${answered ? ' — answered' : ''}`}
          >
            {tq.position || i + 1}
          </button>
        )
      })}
    </div>
  )
}

// Thumb-index — a slim scrollable column of numbered page tabs flush against the
// book's spine. Click any tab to jump straight to that page (precise, even for
// far questions); answered tabs are gilded, the current tab juts out. The column
// auto-centers the current tab. Used by the exam layout (the book).
function QuestionTabs({ questions, answers, currentId, onJump }: {
  questions: TestQuestion[]
  answers: Record<string, string>
  currentId?: number
  onJump: (idx: number) => void
}) {
  const colRef = useRef<HTMLDivElement>(null)
  const curRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const col = colRef.current, cur = curRef.current
    if (!col || !cur) return
    col.scrollTo({ top: cur.offsetTop - col.clientHeight / 2 + cur.offsetHeight / 2, behavior: 'smooth' })
  }, [currentId])

  return (
    <div className="exam-tabs" ref={colRef}>
      {questions.map((tq, i) => {
        const q = tq.question
        if (!q) return null
        const answered = !!answers[String(q.id)]?.trim()
        const current  = q.id === currentId
        return (
          <button
            key={q.id}
            ref={current ? curRef : undefined}
            className={`exam-tab${answered ? ' answered' : ''}${current ? ' current' : ''}`}
            onClick={() => onJump(i)}
            title={`Question ${tq.position || i + 1}${answered ? ' — answered' : ''}`}
          >
            <span className="exam-tab-face">{tq.position || i + 1}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Group context box ──────────────────────────────────────────────────────────

const GROUP_OPTION_LABEL: Partial<Record<Question['type'], string>> = {
  matching_headings:    'Headings',
  matching_information: 'Paragraphs',
  matching_features:    'Features',
}

function GroupContextBox({ group, type }: { group: QuestionGroup; type?: Question['type'] }) {
  const instructions = group.instructions.trim()
  const options      = group.options
  if (!instructions && !options.length) return null

  return (
    <div style={{ marginBottom: 14, padding: '12px 16px', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius)', background: 'var(--bg-muted)' }}>
      {instructions && (
        <div style={{ fontSize: '0.92rem', color: 'var(--ink)', lineHeight: 1.55, marginBottom: options.length ? 10 : 0, whiteSpace: 'pre-line' }}>
          {instructions}
        </div>
      )}
      {options.length > 0 && (
        <>
          <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.8rem', color: 'var(--ink-dim)', marginBottom: 8 }}>
            {(type && GROUP_OPTION_LABEL[type]) ?? 'Options'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {options.map(item => (
              <div key={item.key} style={{ display: 'flex', gap: 10, fontSize: '0.9rem', color: 'var(--ink)' }}>
                <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.78rem', color: 'var(--gold)', minWidth: 22 }}>{item.key}.</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Answer options ─────────────────────────────────────────────────────────────

function AnswerOptions({ q, group, selected, onSelect, revealed = false, attemptId = 0 }: {
  q: Question; group?: QuestionGroup; selected: string; onSelect: (v: string) => void; revealed?: boolean; attemptId?: number
}) {
  const locked     = revealed
  const groupOpts  = group?.options ?? []

  const shuffledMCQ = useMemo(() => {
    if (!q.choice) return []
    // Stable per (attempt, question): same order on every revisit/reload.
    const seed = (Math.imul(attemptId, 0x9e3779b1) + q.id) >>> 0
    return seededShuffle(q.choice.options, seed)
  }, [q.id, attemptId, q.choice])

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
        {shuffledMCQ.map((opt, idx) => {
          const isSel   = selectedKeys.has(opt.key)
          const isCorr  = locked && correctKeys.has(opt.key)
          const isWrong = locked && isSel && !correctKeys.has(opt.key)
          const label   = String.fromCharCode(65 + idx)
          return (
            <button key={opt.key} className={`answer-option ${!locked && isSel ? 'selected' : ''}`}
              onClick={() => toggle(opt.key)}
              style={{ cursor: locked ? 'default' : 'pointer', borderColor: isCorr ? 'rgba(31,122,114,0.6)' : isWrong ? 'rgba(163,34,45,0.6)' : undefined, background: isCorr ? 'rgba(31,122,114,0.08)' : isWrong ? 'rgba(163,34,45,0.06)' : undefined }}>
              <span className="answer-key" style={{ position: 'relative', zIndex: 1 }}>{label}</span>
              <span className="answer-text" style={{ position: 'relative', zIndex: 1 }}>{opt.text}</span>
              {isCorr && <span style={{ marginLeft: 'auto', color: '#1F7A72', fontSize: '0.8rem', position: 'relative', zIndex: 1 }}>✓</span>}
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
              style={{ justifyContent: 'center', cursor: locked ? 'default' : 'pointer', borderColor: isCorr ? 'rgba(31,122,114,0.6)' : isWrong ? 'rgba(163,34,45,0.6)' : undefined, background: isCorr ? 'rgba(31,122,114,0.08)' : isWrong ? 'rgba(163,34,45,0.06)' : undefined }}>
              <span className="answer-text" style={{ textAlign: 'center' }}>{val}</span>
              {isCorr && <span style={{ marginLeft: 8, color: '#1F7A72' }}>✓</span>}
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
    const col = locked ? (isCorr ? 'rgba(31,122,114,0.7)' : 'rgba(163,34,45,0.7)') : 'var(--gold-dim)'
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

  if ((q.type === 'matching_headings' || q.type === 'matching_features' || q.type === 'matching_information') && groupOpts.length) {
    const correct   = q.item?.answer ?? ''
    const isCorr    = locked && selected.trim().toLowerCase() === correct.trim().toLowerCase()
    const corrLabel = groupOpts.find(o => o.key.toLowerCase() === correct.toLowerCase())
    return (
      <div style={{ width: '100%' }}>
        <Select value={selected} onChange={val => !locked && onSelect(val)}
          options={groupOpts.map(o => ({ value: o.key, label: `${o.key}. ${o.text}` }))}
          placeholder="— Select —" disabled={locked} clearable
          triggerStyle={locked ? { borderColor: isCorr ? 'rgba(31,122,114,0.5)' : 'rgba(163,34,45,0.5)', color: isCorr ? '#1F7A72' : '#A3222D' } : undefined} />
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
        style={{ borderColor: locked ? (isCorr ? 'rgba(31,122,114,0.6)' : 'rgba(163,34,45,0.6)') : undefined, color: locked ? (isCorr ? '#1F7A72' : '#A3222D') : undefined }} />
      {locked && !isCorr && <CorrectAnswerBox answer={correct} />}
    </div>
  )
}

// ── Passage body ───────────────────────────────────────────────────────────────

function PassageBody({ text }: { text: string }) {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  return (
    <div style={{ fontSize: '1rem', lineHeight: 1.85, color: 'var(--ink)' }}>
      {paragraphs.map((para, i) => (
        <p key={i} className={i === 0 ? 'drop-cap' : undefined} style={{ marginBottom: 18, whiteSpace: 'pre-line' }}>{para}</p>
      ))}
    </div>
  )
}

// ── Passage layout ─────────────────────────────────────────────────────────────

interface GroupedSection { groupId: number; group?: QuestionGroup; items: TestQuestion[] }

function PassageAttemptLayout({ attempt, questions, groups, answers, setAnswers, onSubmit, isPending }: {
  attempt: any
  questions: TestQuestion[]
  groups: Map<number, QuestionGroup>
  answers: Record<string, string>
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onSubmit: () => void
  isPending: boolean
}) {
  const passages = useMemo(() => {
    const seen = new Map<number, QuestionGroup>()
    questions.forEach(tq => {
      const g = tq.question?.group_id != null ? groups.get(tq.question.group_id) : undefined
      if (g && g.passage.trim() && !seen.has(g.id)) seen.set(g.id, g)
    })
    return [...seen.values()]
  }, [questions, groups])

  // Group questions into sections; standalone questions (no group) get a
  // trailing section of their own rather than disappearing from the page.
  const sections: GroupedSection[] = useMemo(() => {
    const map = new Map<number, GroupedSection>()
    questions.forEach(tq => {
      const q = tq.question
      if (!q) return
      const gid = q.group_id ?? 0
      if (!map.has(gid)) map.set(gid, { groupId: gid, group: groups.get(gid), items: [] })
      map.get(gid)!.items.push(tq)
    })
    return [...map.values()]
      .map(s => ({ ...s, items: [...s.items].sort((a, b) => a.position - b.position) }))
      .sort((a, b) => Math.min(...a.items.map(t => t.position)) - Math.min(...b.items.map(t => t.position)))
  }, [questions, groups])

  const answered = Object.values(answers).filter(Boolean).length

  return (
    <div className="passage-attempt-root" style={{ background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <div style={{ position: 'relative', overflow: 'hidden', zIndex: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 28px', borderBottom: '1px solid var(--border-dim)', background: 'linear-gradient(90deg, var(--bg-panel) 0%, var(--bg-elevated) 100%)' }}>


        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.95rem', color: 'var(--ink)' }}>{attempt.test.name}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-dim)', marginTop: 2 }}>
            {answered} / {questions.length} answered
          </div>
        </div>

        <button className="btn btn-primary" onClick={onSubmit} disabled={isPending} style={{ padding: '9px 26px', position: 'relative', zIndex: 1 }}>
          {isPending ? '…' : 'Submit All →'}
        </button>
      </div>

      {/* ── Two panels ── */}
      <div className="passage-panels">

        {/* Left — passage */}
        <div className="passage-panel-left">

          {passages.map((passage, pi) => (
            <div key={passage.id} style={{ marginTop: pi > 0 ? 36 : 0 }}>
              <div style={{ position: 'relative', marginBottom: 6 }}>
                <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.8rem', color: 'var(--gold-dim)', marginBottom: 8, position: 'relative' }}>
                  Passage{passages.length > 1 ? ` ${pi + 1} of ${passages.length}` : ''}
                </div>
                <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: '1.6rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.25, position: 'relative', marginBottom: 14 }}>
                  {passage.title || 'Untitled passage'}
                </h2>
              </div>
              <OrnateDivider />
              <div style={{ marginTop: 18 }}>
                <PassageBody text={passage.passage} />
              </div>
            </div>
          ))}
        </div>

        {/* Right — questions */}
        <div className="passage-panel-right">
          <div style={{ marginBottom: 24 }}>
            <QuestionNavigator
              questions={questions}
              answers={answers}
              onJump={(i) => {
                const q = questions[i]?.question
                if (q) document.getElementById(`attempt-q-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}
            />
          </div>
          {sections.map(({ groupId, group, items }) => (
            <div key={groupId} style={{ position: 'relative', marginBottom: 36, paddingLeft: 12, borderLeft: '2px solid var(--border-dim)' }}>
              {group && <GroupContextBox group={group} type={items[0]?.question?.type} />}
              {items.map((tq) => {
                const q = tq.question!
                const sel = answers[String(q.id)] ?? ''
                const isFillBlank = q.type === 'sentence_completion' || q.type === 'form_completion'
                return (
                  <div key={q.id} id={`attempt-q-${q.id}`} style={{ marginBottom: 20, scrollMarginTop: 80 }}>
                    {isFillBlank ? (
                      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                        <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.8rem', color: 'var(--gold-dim)', minWidth: 28, flexShrink: 0 }}>
                          {tq.position}.
                        </span>
                        <div style={{ flex: 1 }}>
                          <AnswerOptions q={q} group={group} selected={sel} onSelect={val => setAnswers(prev => ({ ...prev, [String(q.id)]: val }))} attemptId={attempt.id} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 8 }}>
                          <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.8rem', color: 'var(--gold-dim)', minWidth: 28, paddingTop: 2 }}>
                            {tq.position}.
                          </span>
                          <p style={{ flex: 1, margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '1rem', color: 'var(--ink)', lineHeight: 1.5 }}>
                            {questionContent(q)}
                          </p>
                        </div>
                        <div style={{ paddingLeft: 40 }}>
                          <AnswerOptions q={q} group={group} selected={sel} onSelect={val => setAnswers(prev => ({ ...prev, [String(q.id)]: val }))} attemptId={attempt.id} />
                        </div>
                      </>
                    )}
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

// ── Exam layout (standalone tests) ──────────────────────────────────────────────
// Answer questions in any order via the navigator. Each question can be checked
// in place — that reveals the correct answer, locks the question, and feeds the
// running score — exactly like the old flash cards, but now you can also jump
// around freely. One Submit at the end records the official attempt. Opens at the
// first unanswered question so a resumed attempt lands where the taker left off.
//
// Reveal/lock state is session-local (not persisted): a reload restores answers
// but no question is locked, so the taker can keep checking from there.

function ExamLayout({ attempt, questions, groups, answers, setAnswers, onSubmit, isPending }: {
  attempt: any
  questions: TestQuestion[]
  groups: Map<number, QuestionGroup>
  answers: Record<string, string>
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onSubmit: () => void
  isPending: boolean
}) {
  const total = questions.length

  // Seed the starting question once (first unanswered) — afterwards the taker
  // drives currentIdx via the navigator / prev-next.
  const firstUnanswered = useMemo(() => {
    const i = questions.findIndex(tq => !answers[String(tq.question?.id)]?.trim())
    return i === -1 ? 0 : i
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [currentIdx,  setCurrentIdx]  = useState(firstUnanswered)
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set())
  const [flash,       setFlash]       = useState<{ key: number; type: 'correct' | 'wrong' } | null>(null)

  const idx = Math.min(currentIdx, total - 1)
  const tq  = questions[idx]
  const q   = tq?.question
  if (!q) return null

  const group    = q.group_id != null ? groups.get(q.group_id) : undefined
  const content  = questionContent(q)
  const sel      = answers[String(q.id)] ?? ''
  const answered = Object.values(answers).filter(v => v?.trim()).length
  const isLast   = idx === total - 1

  let score = 0, scorable = 0
  questions.forEach(t => {
    const qq = t.question
    if (!qq || !revealedIds.has(qq.id)) return
    scorable++
    if (checkAnswer(qq, answers[String(qq.id)] ?? '')) score++
  })

  const revealed    = revealedIds.has(q.id)
  const isSkippable = q.type === 'sentence_completion' || q.type === 'form_completion' || q.type === 'short_answer'
  const isCorrect   = revealed && checkAnswer(q, sel)

  const setAnswer = (val: string) => setAnswers(prev => ({ ...prev, [String(q.id)]: val }))

  const reveal = (markWrong: boolean) => {
    setRevealedIds(prev => new Set(prev).add(q.id))
    const correct = !markWrong && checkAnswer(q, sel)
    setFlash({ key: Date.now(), type: correct ? 'correct' : 'wrong' })
  }
  const handleCheck = () => { if (sel) reveal(false) }
  const handleSkip  = () => { setAnswer(''); reveal(true) }

  return (
    <>
      {flash && <div key={flash.key} className={`bg-flash bg-flash-${flash.type}`}
        style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />}
      <div className="attempt-layout">

        {/* ── Header ── */}
        <div className="attempt-header">

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '1rem', color: 'var(--ink)' }}>{attempt.test.name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--ink-dim)', marginTop: 2 }}>
              Question {idx + 1} / {total} · {answered} answered
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, position: 'relative', zIndex: 1 }}>
            {scorable > 0 && (
              <div style={{ textAlign: 'right', position: 'relative' }}>
                <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '1.4rem', color: 'var(--gold)', lineHeight: 1, position: 'relative' }}>
                  {score}<span style={{ fontSize: '0.85rem', color: 'var(--ink-dim)', marginLeft: 2 }}>/ {scorable}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-dim)', fontFamily: 'IBM Plex Sans, sans-serif' }}>Score</div>
              </div>
            )}
            <button className="btn btn-primary" onClick={onSubmit} disabled={isPending} style={{ padding: '9px 26px' }}>
              {isPending ? '…' : 'Submit All →'}
            </button>
          </div>
        </div>

        {/* ── Body: thumb-index + book page ── */}
        <div className="exam-book">
          <QuestionTabs questions={questions} answers={answers} currentId={q.id} onJump={setCurrentIdx} />

          <div className="book-page">

            <div className="book-page-inner">
              {group?.title && (
                <div style={{ marginBottom: 12, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.8rem', color: 'var(--ink-dim)' }}>
                  {group.title}
                </div>
              )}

              {group && <GroupContextBox group={group} type={q.type} />}

              {/* Page head — chapter-style number + tags + verdict */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.8rem', color: 'var(--gold-dim)' }}>
                  Question {idx + 1}
                </span>
                <TypeTag type={q.type} />
                <DifficultyTag difficulty={q.difficulty} />
                {revealed && (
                  <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.8rem', padding: '2px 8px', border: '1px solid', borderColor: isCorrect ? 'rgba(31,122,114,0.5)' : 'rgba(163,34,45,0.5)', color: isCorrect ? '#1F7A72' : '#A3222D' }}>
                    {isCorrect ? '✓ Correct' : '✕ Wrong'}
                  </span>
                )}
              </div>

              <OrnateDivider />

              <p className="question-text" style={{ marginTop: 18, marginBottom: 22 }}>{content}</p>

              <AnswerOptions q={q} group={group} selected={sel} onSelect={setAnswer} revealed={revealed} attemptId={attempt.id} />

              <div style={{ display: 'flex', gap: 12, marginTop: 24, alignItems: 'center' }}>
                <button className="btn" onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
                  style={{ padding: '10px 22px', color: 'var(--ink-dim)', borderColor: 'var(--border-dim)', opacity: idx === 0 ? 0.4 : 1 }}>
                  ‹ Prev
                </button>
                {!revealed ? (
                  <>
                    <button className="btn btn-primary" onClick={handleCheck} disabled={!sel} style={{ padding: '10px 32px' }}>Check</button>
                    {isSkippable && (
                      <button className="btn" onClick={handleSkip} style={{ padding: '10px 22px', color: 'var(--ink-dim)', borderColor: 'var(--border-dim)' }}>Skip</button>
                    )}
                  </>
                ) : !isLast ? (
                  <button className="btn btn-primary" onClick={() => setCurrentIdx(i => Math.min(total - 1, i + 1))} style={{ padding: '10px 32px' }}>
                    Next ›
                  </button>
                ) : (
                  <button className="btn btn-primary pulse" onClick={onSubmit} disabled={isPending} style={{ padding: '10px 32px' }}>
                    {isPending ? '…' : 'Finish ›'}
                  </button>
                )}
              </div>
            </div>

            <div className="book-page-foot">— {idx + 1} / {total} —</div>
          </div>
          {/* The page sits left; the solar-system background fills the open right. */}
        </div>
      </div>
    </>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function AttemptPage() {
  const { bankId = '', id = '' } = useParams<{ bankId: string; id: string }>()
  const navigate          = useNavigate()
  const { data: attempt, isError } = useAttempt(bankId, id)
  const submit            = useSubmitAttempt()
  const saveProgress      = useSaveAttemptProgress()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [hydrated, setHydrated] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Seed local answers from the server once per attempt, so a reload resumes
  // exactly where the taker left off. We hold rendering until this runs (see the
  // !hydrated guard below) so the exam layout opens at the first *unanswered*
  // question rather than always at question one.
  const seededFor = useRef<number | null>(null)
  useEffect(() => {
    if (attempt && seededFor.current !== attempt.id) {
      setAnswers(attempt.answers ?? {})
      seededFor.current = attempt.id
      setHydrated(true)
    }
  }, [attempt])

  // Debounced autosave of in-progress answers. dirtyRef gates out the initial
  // seed (no point re-saving what we just loaded); submittedRef stops a stray
  // save from racing the final grade-and-complete Submit.
  const dirtyRef     = useRef(false)
  const submittedRef = useRef(false)
  const latest       = useRef(answers)
  latest.current     = answers
  const completed    = !!attempt?.completed_at

  useEffect(() => {
    if (!attempt || completed || submittedRef.current) return
    if (seededFor.current !== attempt.id || !dirtyRef.current) return
    // Re-check submittedRef when the timer fires — Submit may have happened
    // inside the debounce window.
    const t = setTimeout(() => { if (!submittedRef.current) saveProgress.mutate({ bankId, id, answers }) }, 700)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, completed])

  // Flush the last edit on unmount — the debounce may not have fired yet.
  useEffect(() => () => {
    if (dirtyRef.current && !submittedRef.current && seededFor.current != null) {
      saveProgress.mutate({ bankId, id, answers: latest.current })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // setAnswers wrapper that marks the attempt dirty on a real user edit.
  const updateAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>> = (action) => {
    dirtyRef.current = true
    setAnswers(action)
  }

  if (isError) return (
    <div className="attempt-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '1rem', color: 'var(--ink)' }}>Attempt Not Found</div>
        <div style={{ fontSize: '0.88rem', color: 'var(--ink-dim)' }}>This attempt could not be loaded — it may have been removed, or you may not have access.</div>
        <button className="btn btn-primary" onClick={() => navigate('/')} style={{ padding: '10px 28px' }}>Go Home</button>
      </div>
    </div>
  )

  if (!attempt?.test || !hydrated) return (
    <div className="attempt-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={100} />
    </div>
  )

  // A completed attempt is read-only — navigating back to it (e.g. browser Back
  // from the results page) shows the results, not a live exam whose Submit
  // would only be rejected by the server.
  if (completed) return <Navigate to={`/attempts/${bankId}/${id}/results`} replace />

  const questions = attempt.test.questions ?? []
  const total     = questions.length

  if (total === 0) return (
    <div className="attempt-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '1rem', color: 'var(--ink)' }}>No Questions</div>
        <div style={{ fontSize: '0.88rem', color: 'var(--ink-dim)' }}>This test was generated with no matching questions.</div>
        <button className="btn btn-primary" onClick={() => navigate(-1)} style={{ padding: '10px 28px' }}>Go Back</button>
      </div>
    </div>
  )

  const groups        = new Map(attempt.test.groups.map(g => [g.id, g]))
  const isPassageTest = questions.some(tq => {
    const gid = tq.question?.group_id
    return gid != null && !!groups.get(gid)?.passage.trim()
  })

  const handleSubmit = async () => {
    if (submit.isPending || submittedRef.current) return
    submittedRef.current = true
    try {
      await submit.mutateAsync({ bankId, id, answers })
      navigate(`/attempts/${bankId}/${id}/results`)
    } catch {
      // Re-arm autosave and let the taker retry instead of dying silently.
      submittedRef.current = false
      setSubmitError('Submission failed — check your connection and try again.')
    }
  }

  const errorBanner = submitError && (
    <div
      onClick={() => setSubmitError(null)}
      style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
        padding: '10px 18px', background: 'rgba(163,34,45,0.95)', color: '#fff',
        fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      {submitError} <span style={{ opacity: 0.7 }}>✕</span>
    </div>
  )

  if (isPassageTest) {
    return (
      <>
        {errorBanner}
        <PassageAttemptLayout
          attempt={attempt}
          questions={questions}
          groups={groups}
          answers={answers}
          setAnswers={updateAnswers}
          onSubmit={handleSubmit}
          isPending={submit.isPending}
        />
      </>
    )
  }

  return (
    <>
      {errorBanner}
      <ExamLayout
        attempt={attempt}
        questions={questions}
        groups={groups}
        answers={answers}
        setAnswers={updateAnswers}
        onSubmit={handleSubmit}
        isPending={submit.isPending}
      />
    </>
  )
}
