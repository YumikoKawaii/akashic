import { useParams, useNavigate } from 'react-router-dom'
import { useAttempt } from '../hooks/useAttempts'
import { Question } from '../types'
import OrnatePanel from '../components/ui/OrnatePanel'
import OrnateDivider from '../components/ui/OrnateDivider'
import Starfield from '../components/ui/Starfield'
import { Spinner, MagicCircleBackground } from '../components/ui/MagicCircle'
import QuestionCarousel from '../components/results/QuestionCarousel'

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
      <MagicCircleBackground />
      <Spinner size={100} />
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
      <MagicCircleBackground />
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
          <div style={{ width: '100%' }}>
            <QuestionCarousel
              cards={questions.flatMap((entry, gi) => {
                const q = entry?.question
                if (!q) return []
                const userAns = attempt.answers?.[String(q.id)]
                return [{
                  index: gi,
                  question: q,
                  userAnswer: userAns,
                  correct: isCorrectAnswer(q, userAns),
                }]
              })}
            />
          </div>
          <div style={{ height: 40 }} />
        </div>
      </div>

    </>
  )
}
