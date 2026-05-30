import { useState } from 'react'
import { Category, ProposedQuestion, QuestionDifficulty, QuestionType, MCQOption } from '../../types'
import { FormField, Input, Textarea } from '../ui/FormField'
import Select from '../ui/Select'

interface Props {
  categories: Category[]
  initial?: ProposedQuestion
  submitLabel: string
  pending?: boolean
  onSubmit: (proposed: ProposedQuestion) => void
  onCancel?: () => void
}

const TYPE_OPTIONS = [
  { value: 'mcq',                  label: 'MCQ' },
  { value: 'tf_ng',                label: 'True / False / Not Given' },
  { value: 'yn_ng',                label: 'Yes / No / Not Given' },
  { value: 'sentence_completion',  label: 'Sentence Completion' },
  { value: 'form_completion',      label: 'Form Completion' },
  { value: 'short_answer',         label: 'Short Answer' },
]

const DIFF_OPTIONS = [
  { value: 'easy',   label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard' },
]

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F']

const isMCQ = (t: QuestionType) => t === 'mcq'
const isFillBlank = (t: QuestionType) => t === 'sentence_completion' || t === 'form_completion'

export default function ProposedQuestionForm({ categories, initial, submitLabel, pending, onSubmit, onCancel }: Props) {
  const [content,    setContent]    = useState(initial?.content ?? '')
  const [type,       setType]       = useState<QuestionType>(initial?.type ?? 'mcq')
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(initial?.difficulty ?? 'medium')
  const [categoryId, setCategoryId] = useState<number>(initial?.category_id ?? (categories[0]?.id ?? 0))
  const [tags,       setTags]       = useState(initial?.tags?.join(', ') ?? '')
  const [answer,     setAnswer]     = useState(initial?.answer ?? '')
  const [mcqTexts,   setMcqTexts]   = useState<string[]>(initial?.options?.map(o => o.text) ?? ['', '', '', ''])
  const [mcqAnswers, setMcqAnswers] = useState<string[]>(initial?.answers ?? [])

  const handleTypeChange = (t: QuestionType) => { setType(t); setAnswer(''); setMcqAnswers([]) }
  const updateMcqText = (i: number, val: string) => setMcqTexts(prev => prev.map((o, idx) => idx === i ? val : o))
  const toggleMcqAnswer = (key: string) => setMcqAnswers(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const valid = (() => {
    if (!content.trim() || !categoryId) return false
    if (isMCQ(type)) return mcqTexts.some(t => t.trim()) && mcqAnswers.length > 0
    return !!answer.trim()
  })()

  const handleSubmit = () => {
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)
    if (isMCQ(type)) {
      const options: MCQOption[] = mcqTexts.map((text, i) => ({ key: OPTION_KEYS[i], text })).filter(o => o.text)
      onSubmit({ category_id: categoryId, type, difficulty, tags: tagList, content, options, answers: mcqAnswers })
    } else {
      onSubmit({ category_id: categoryId, type, difficulty, tags: tagList, content, answer })
    }
  }

  return (
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
          <Select value={type} onChange={v => handleTypeChange(v as QuestionType)} options={TYPE_OPTIONS} />
        </FormField>
        <FormField label="Difficulty">
          <Select value={difficulty} onChange={v => setDifficulty(v as QuestionDifficulty)} options={DIFF_OPTIONS} />
        </FormField>
      </div>

      {isMCQ(type) && (
        <div className="flex flex-col gap-3">
          <div className="section-title">Answer Options</div>
          {mcqTexts.map((opt, i) => (
            <div key={i} className="flex gap-3 items-center">
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: 'var(--gold-dim)', minWidth: 20 }}>{OPTION_KEYS[i]}</span>
              <Input value={opt} onChange={e => updateMcqText(i, e.target.value)} placeholder={`Option ${OPTION_KEYS[i]}`} />
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
            options={[{ value: 'True', label: 'True' }, { value: 'False', label: 'False' }, { value: 'Not Given', label: 'Not Given' }]}
            placeholder="— Select —" />
        </FormField>
      )}

      {type === 'yn_ng' && (
        <FormField label="Correct Answer">
          <Select value={answer} onChange={setAnswer}
            options={[{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }, { value: 'Not Given', label: 'Not Given' }]}
            placeholder="— Select —" />
        </FormField>
      )}

      {(isFillBlank(type) || type === 'short_answer') && (
        <FormField label="Correct Answer">
          <Input value={answer} onChange={e => setAnswer(e.target.value)}
            placeholder={isFillBlank(type) ? 'e.g. industrial revolution' : 'e.g. London'} />
          {isFillBlank(type) && (
            <p style={{ fontSize: '0.75rem', color: 'var(--ink-dim)', marginTop: 6 }}>
              Use <code style={{ fontFamily: 'monospace', background: 'rgba(154,112,24,0.08)', padding: '1px 5px' }}>___</code> in the question text to mark the blank. Grading is case-insensitive.
            </p>
          )}
        </FormField>
      )}

      <FormField label="Tags (comma separated)">
        <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="grammar, vocabulary, n3" />
      </FormField>

      <div className="flex gap-3 mt-2">
        <button className="btn btn-primary" onClick={handleSubmit} disabled={pending || !valid}>
          {pending ? '…' : submitLabel}
        </button>
        {onCancel && <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  )
}
