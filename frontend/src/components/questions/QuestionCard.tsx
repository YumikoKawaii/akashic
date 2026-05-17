import { Question } from '../../types'
import { TypeTag, DifficultyTag, CategoryTag } from '../ui/Tag'
import { useDeleteQuestion } from '../../hooks/useQuestions'
import { useNavigate } from 'react-router-dom'
import MagicCircle from '../ui/MagicCircle'

const DIFF_CIRCLE_COLOR: Record<string, string> = {
  easy:   '#2a8a3a',
  medium: '#9a7018',
  hard:   '#b03030',
}

interface Props {
  question: Question
  index: number
  bankId: string
}

export default function QuestionCard({ question, index, bankId }: Props) {
  const navigate = useNavigate()
  const del      = useDeleteQuestion(bankId)

  const content = question.item?.content ?? question.choice?.content ?? ''

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this question?')) del.mutate(question.id)
  }

  const diffColor = DIFF_CIRCLE_COLOR[question.difficulty] ?? DIFF_CIRCLE_COLOR.medium

  return (
    <div
      className="q-card"
      style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
      onClick={() => navigate(`/banks/${bankId}/questions/${question.id}/edit`)}
    >
      {/* Top-left: outer rings, difficulty-colored */}
      <div style={{ position: 'absolute', top: -28, left: -28, width: 72, height: 72, color: diffColor, opacity: 0.22, pointerEvents: 'none', zIndex: 0 }}>
        <MagicCircle variant="outer" />
      </div>
      {/* Bottom-right: inner geometry, gold */}
      <div style={{ position: 'absolute', bottom: -28, right: -28, width: 64, height: 64, color: '#9a7018', opacity: 0.18, pointerEvents: 'none', zIndex: 0 }}>
        <MagicCircle variant="inner" />
      </div>

      <div className="flex items-start gap-4" style={{ position: 'relative', zIndex: 1 }}>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.68rem', color: 'var(--gold-dim)', paddingTop: 3, minWidth: 28, textAlign: 'right' }}>
          {String(index + 1).padStart(3, '0')}
        </span>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.55, color: 'var(--ink)' }}>
            {content}
          </p>
          <div className="flex flex-wrap gap-2 mt-2 items-center">
            <TypeTag type={question.type} />
            <DifficultyTag difficulty={question.difficulty} />
            {question.category && <CategoryTag name={question.category.name} />}
            {question.tags?.map(t => <CategoryTag key={t} name={t} />)}
          </div>
        </div>

        <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
          <button
            className="btn-icon"
            onClick={() => navigate(`/banks/${bankId}/questions/${question.id}/edit`)}
          >✎</button>
          <button
            className="btn-danger"
            onClick={handleDelete}
            disabled={del.isPending}
          >✕</button>
        </div>
      </div>
    </div>
  )
}
