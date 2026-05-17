import { useParams } from 'react-router-dom'
import { useCategories } from '../hooks/useCategories'
import { useQuestion } from '../hooks/useQuestions'
import QuestionForm from '../components/questions/QuestionForm'
import { Spinner } from '../components/ui/MagicCircle'

export default function QuestionFormPage() {
  const { bankId = '', questionId } = useParams<{ bankId: string; questionId?: string }>()
  const { data: categories = [] }   = useCategories(bankId)
  const { data: question }          = useQuestion(bankId, questionId ?? '')

  const isEdit = !!questionId
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
      <QuestionForm
        bankId={bankId}
        categories={categories}
        initial={question}
      />
    </>
  )
}
