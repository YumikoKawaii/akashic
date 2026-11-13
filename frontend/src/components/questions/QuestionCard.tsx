import { useState } from 'react'
import { Question } from '../../types'
import { TypeTag, DifficultyTag, CategoryTag } from '../ui/Tag'
import { useDeleteQuestion } from '../../hooks/useQuestions'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../ui/ConfirmDialog'

interface Props {
  question: Question
  index: number
  bankId: string
  canEdit: boolean
}

export default function QuestionCard({ question, index, bankId, canEdit }: Props) {
  const navigate   = useNavigate()
  const del        = useDeleteQuestion(bankId)
  const [confirming, setConfirming] = useState(false)

  const content = question.item?.content ?? question.choice?.content ?? ''

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming(true)
  }

  return (
    <>
    <div
      className="q-card"
      style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s`, cursor: canEdit ? 'pointer' : 'default' }}
      onClick={() => canEdit && navigate(`/banks/${bankId}/questions/${question.id}/edit`)}
    >
      <div className="flex items-start gap-4" style={{ position: 'relative', zIndex: 1 }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.68rem', color: 'var(--gold-dim)', paddingTop: 3, minWidth: 28, textAlign: 'right' }}>
          {String(index + 1).padStart(3, '0')}
        </span>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.55, color: 'var(--ink)' }}>
            {content}
          </p>
          <div className="flex flex-wrap gap-2 mt-2 items-center">
            <TypeTag type={question.type} />
            <DifficultyTag difficulty={question.difficulty} />
            {question.tags?.map(t => <CategoryTag key={t} name={t} />)}
          </div>
        </div>

        {canEdit && (
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
        )}
      </div>
    </div>

    {confirming && (
      <ConfirmDialog
        message="Delete this question? This action cannot be undone."
        onConfirm={() => { setConfirming(false); del.mutate(question.id) }}
        onCancel={() => setConfirming(false)}
      />
    )}
  </>
  )
}
