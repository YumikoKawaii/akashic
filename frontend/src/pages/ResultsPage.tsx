import { useParams, useNavigate } from 'react-router-dom'
import { useAttempt } from '../hooks/useAttempts'
import { Question } from '../types'
import OrnatePanel from '../components/ui/OrnatePanel'
import OrnateDivider from '../components/ui/OrnateDivider'
import Starfield from '../components/ui/Starfield'
import { Spinner, MagicCircleBackground } from '../components/ui/MagicCircle'
import QuestionCarousel from '../components/results/QuestionCarousel'
import WaxSeal from '../components/ui/WaxSeal'

// Mirrors the backend grader (service/attempt.go) so the per-question marks
// always sum to the official score shown above — including short answers,
// which the backend grades by case-insensitive exact match.
function isCorrectAnswer(q: Question, userAns: string | undefined): boolean {
  if (!userAns) return false
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
    case 'short_answer':
      return got.toLowerCase() === want.toLowerCase()
    default:
      return got === want
  }
}

export default function ResultsPage() {
  const { bankId = '', id = '' } = useParams<{ bankId: string; id: string }>()
  const navigate    = useNavigate()
  const { data: attempt, isError } = useAttempt(bankId, id)

  if (isError) return (
    <div className="attempt-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Starfield />
      <MagicCircleBackground />
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'var(--ink)' }}>Attempt Not Found</div>
        <div style={{ fontSize: '0.88rem', color: 'var(--ink-dim)' }}>This attempt could not be loaded — it may have been removed, or you may not have access.</div>
        <button className="btn btn-primary" onClick={() => navigate('/')} style={{ padding: '10px 28px' }}>Go Home</button>
      </div>
    </div>
  )

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
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <WaxSeal letter={grade} color={gradeColor} />
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
