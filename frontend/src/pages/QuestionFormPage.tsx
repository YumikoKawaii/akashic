import { useParams } from 'react-router-dom'
import { useCategories } from '../hooks/useCategories'
import { useQuestion } from '../hooks/useQuestions'
import QuestionForm from '../components/questions/QuestionForm'
import { Spinner } from '../components/ui/MagicCircle'

export default function QuestionFormPage() {
  const { bankId = '', questionId } = useParams<{ bankId: string; questionId?: string }>()
  const { data: categories = [] }   = useCategories(bankId)
  const { data: question, isError } = useQuestion(bankId, questionId ?? '')

  const isEdit = !!questionId

  if (isEdit && isError) return (
    <div className="flex items-center justify-center h-full" style={{ flexDirection: 'column', gap: 12, textAlign: 'center' }}>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'var(--ink)' }}>Question Not Found</div>
      <div style={{ fontSize: '0.88rem', color: 'var(--ink-dim)' }}>This question could not be loaded — it may have been removed.</div>
    </div>
  )

  if (isEdit && !question) return (
    <div className="flex items-center justify-center h-full">
      <Spinner />
    </div>
  )

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit' : 'New'} — <span>Question</span></h1>
        </div>
      </div>
      {/* Keyed so back/forward between two cached edit routes re-seeds the form
          instead of silently saving question A's fields over question B. */}
      <QuestionForm
        key={question?.id ?? 'new'}
        bankId={bankId}
        categories={categories}
        initial={question}
      />
    </>
  )
}
