import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Category, Question, QuestionDifficulty, QuestionType, MCQOption } from '../../types'
import { FormField, Input, Textarea } from '../ui/FormField'
import Select from '../ui/Select'
import OrnatePanel from '../ui/OrnatePanel'
import { useCreateQuestion, useUpdateQuestion } from '../../hooks/useQuestions'

interface Props {
  bankId: string
  categories: Category[]
  initial?: Question
}

const TYPE_OPTIONS = [
  { value: 'mcq',                  label: 'MCQ' },
  { value: 'tf_ng',                label: 'True / False / Not Given' },
  { value: 'yn_ng',                label: 'Yes / No / Not Given' },
  { value: 'sentence_completion',  label: 'Sentence Completion' },
  { value: 'form_completion',      label: 'Form Completion' },
  { value: 'short_answer',         label: 'Short Answer' },
]

// Group-bound types can't be created standalone, but an existing question may
// have one — shown read-only in edit mode.
const ALL_TYPE_OPTIONS = [
  ...TYPE_OPTIONS,
  { value: 'matching_headings',    label: 'Matching Headings' },
  { value: 'matching_information', label: 'Matching Information' },
  { value: 'matching_features',    label: 'Matching Features' },
]

const DIFF_OPTIONS = [
  { value: 'easy',   label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard' },
]

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F']

function isMCQ(t: QuestionType) { return t === 'mcq' }
function isFillBlank(t: QuestionType) { return t === 'sentence_completion' || t === 'form_completion' }

export default function QuestionForm({ bankId, categories, initial }: Props) {
  const navigate = useNavigate()
  const create   = useCreateQuestion(bankId)
  const update   = useUpdateQuestion(bankId)
  const isEdit   = !!initial

  // Seed each stored option's text at its key's slot (an existing question may
  // have non-contiguous keys, e.g. [A, C]) — otherwise the texts get re-keyed by
  // index on save while the stored answer keys don't move, desyncing the two.
  const seedMcqTexts = (): string[] => {
    const arr = ['', '', '', '']
    initial?.choice?.options.forEach(o => {
      const i = OPTION_KEYS.indexOf(o.key)
      if (i >= 0) { while (arr.length <= i) arr.push(''); arr[i] = o.text }
    })
    return arr
  }

  const [content,      setContent]      = useState(initial?.item?.content ?? initial?.choice?.content ?? '')
  const [type,         setType]         = useState<QuestionType>(initial?.type ?? 'mcq')
  const [difficulty,   setDifficulty]   = useState<QuestionDifficulty>(initial?.difficulty ?? 'medium')
  const [categoryId,   setCategoryId]   = useState<number>(initial?.category_id ?? (categories[0]?.id ?? 0))
  const [tags,         setTags]         = useState(initial?.tags?.join(', ') ?? '')
  const [answer,       setAnswer]       = useState(initial?.item?.answer ?? '')
  const [mcqTexts,     setMcqTexts]     = useState<string[]>(seedMcqTexts)
  const [mcqAnswers,   setMcqAnswers]   = useState<string[]>(initial?.choice?.answers ?? [])
  const [submitError,  setSubmitError]  = useState<string | null>(null)

  // Categories usually load after mount on the "new" page — adopt the first one
  // once they arrive so the form doesn't submit category_id 0.
  useEffect(() => {
    if (!categoryId && categories.length) setCategoryId(categories[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories])

  const handleTypeChange = (t: QuestionType) => {
    setType(t)
    setAnswer('')
    setMcqAnswers([])
  }

  // Blanking an option's text also retires its answer key — a checked-then-
  // cleared option must not survive as an invisible (unwinnable) correct answer.
  const updateMcqText = (i: number, val: string) => {
    setMcqTexts(prev => prev.map((o, idx) => idx === i ? val : o))
    if (!val.trim()) setMcqAnswers(prev => prev.filter(k => k !== OPTION_KEYS[i]))
  }

  const toggleMcqAnswer = (key: string) =>
    setMcqAnswers(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const survivingOptions: MCQOption[] = mcqTexts
    .map((text, i) => ({ key: OPTION_KEYS[i], text: text.trim() }))
    .filter(o => o.text)
  const survivingAnswers = mcqAnswers.filter(k => survivingOptions.some(o => o.key === k))

  const valid = (() => {
    if (!content.trim() || !categoryId || !type) return false
    if (isMCQ(type)) return survivingOptions.length > 0 && survivingAnswers.length > 0
    return !!answer.trim()
  })()

  const handleSubmit = async () => {
    if (isPending || !valid) return
    setSubmitError(null)
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)

    try {
      if (isMCQ(type)) {
        const payload = { category_id: categoryId, type, difficulty, tags: tagList, content, options: survivingOptions, answers: survivingAnswers }
        if (isEdit) await update.mutateAsync({ id: String(initial!.id), data: payload })
        else        await create.mutateAsync(payload)
      } else {
        const payload = { category_id: categoryId, type, difficulty, tags: tagList, content, answer }
        if (isEdit) await update.mutateAsync({ id: String(initial!.id), data: payload })
        else        await create.mutateAsync(payload)
      }
      navigate(`/banks/${bankId}`)
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Saving failed — please try again.')
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <OrnatePanel>
      <div className="section-title" style={{ marginBottom: 20 }}>
        {isEdit ? 'Edit Question' : 'New Question'}
      </div>

      <div className="flex flex-col gap-5">
        <FormField label="Question Text">
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={isFillBlank(type) ? 'Use ___ to mark the blank…' : 'Enter the question…'}
            rows={3}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Category">
            <Select
              value={String(categoryId)}
              onChange={v => setCategoryId(Number(v))}
              options={categories.map(c => ({ value: String(c.id), label: c.name }))}
              placeholder="Select category"
            />
          </FormField>
          <FormField label="Type">
            {/* The update RPC cannot change a question's type — the backend
                writes into the shape the row already has, so a changed type
                silently corrupted the question. Read-only in edit mode. */}
            <Select
              value={type}
              onChange={v => handleTypeChange(v as QuestionType)}
              options={isEdit ? ALL_TYPE_OPTIONS : TYPE_OPTIONS}
              disabled={isEdit}
            />
          </FormField>
          <FormField label="Difficulty">
            <Select
              value={difficulty}
              onChange={v => setDifficulty(v as QuestionDifficulty)}
              options={DIFF_OPTIONS}
            />
          </FormField>
        </div>

        {isMCQ(type) && (
          <div className="flex flex-col gap-3">
            <div className="section-title">Answer Options</div>
            {mcqTexts.map((opt, i) => (
              <div key={i} className="flex gap-3 items-center">
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: 'var(--gold-dim)', minWidth: 20 }}>
                  {OPTION_KEYS[i]}
                </span>
                <Input
                  value={opt}
                  onChange={e => updateMcqText(i, e.target.value)}
                  placeholder={`Option ${OPTION_KEYS[i]}`}
                />
                <input
                  type="checkbox"
                  checked={mcqAnswers.includes(OPTION_KEYS[i]) && opt !== ''}
                  onChange={() => opt && toggleMcqAnswer(OPTION_KEYS[i])}
                  style={{ accentColor: 'var(--gold)', width: 16, height: 16, flexShrink: 0 }}
                />
              </div>
            ))}
            <p style={{ fontSize: '0.75rem', color: 'var(--ink-dim)' }}>Check the correct answer(s).</p>
          </div>
        )}

        {type === 'tf_ng' && (
          <FormField label="Correct Answer">
            <Select value={answer} onChange={setAnswer}
              options={[
                { value: 'True',      label: 'True' },
                { value: 'False',     label: 'False' },
                { value: 'Not Given', label: 'Not Given' },
              ]}
              placeholder="— Select —"
            />
          </FormField>
        )}

        {type === 'yn_ng' && (
          <FormField label="Correct Answer">
            <Select value={answer} onChange={setAnswer}
              options={[
                { value: 'Yes',       label: 'Yes' },
                { value: 'No',        label: 'No' },
                { value: 'Not Given', label: 'Not Given' },
              ]}
              placeholder="— Select —"
            />
          </FormField>
        )}

        {(isFillBlank(type) || type === 'short_answer') && (
          <FormField label="Correct Answer">
            <Input
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder={isFillBlank(type) ? 'e.g. industrial revolution' : 'e.g. London'}
            />
            {isFillBlank(type) && (
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-dim)', marginTop: 6 }}>
                Use <code style={{ fontFamily: 'monospace', background: 'rgba(154,112,24,0.08)', padding: '1px 5px' }}>___</code> in the question text to mark the blank. Grading is case-insensitive.
              </p>
            )}
          </FormField>
        )}

        <FormField label="Tags (comma separated)">
          <Input
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="grammar, vocabulary, n3"
          />
        </FormField>

        {submitError && (
          <div style={{ padding: '10px 14px', background: 'rgba(176,48,48,0.06)', border: '1px solid rgba(176,48,48,0.3)', fontSize: '0.85rem', color: '#b03030' }}>
            {submitError}
          </div>
        )}

        <div className="flex gap-3 mt-2">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isPending || !valid}>
            {isPending ? '…' : isEdit ? '⚔ Save Changes' : '⚔ Create Question'}
          </button>
          <button className="btn btn-ghost" onClick={() => navigate(`/banks/${bankId}`)}>
            Cancel
          </button>
        </div>
      </div>
    </OrnatePanel>
  )
}
