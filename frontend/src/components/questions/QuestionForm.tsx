import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Category, Passage, Question, QuestionDifficulty, QuestionType } from '../../types'
import { FormField, Input, Textarea } from '../ui/FormField'
import Select from '../ui/Select'
import OrnatePanel from '../ui/OrnatePanel'
import { useCreateQuestion, useUpdateQuestion } from '../../hooks/useQuestions'

interface Props {
  bankId: string
  categories: Category[]
  passages?: Passage[]
  initial?: Question
}

const TYPE_OPTIONS   = [
  { value: 'mcq',                 label: 'MCQ' },
  { value: 'true_false',          label: 'True / False' },
  { value: 'open',                label: 'Open' },
  { value: 'tf_ng',               label: 'T / F / Not Given' },
  { value: 'sentence_completion', label: 'Fill in Blank' },
]
const DIFF_OPTIONS   = [
  { value: 'easy',   label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard' },
]
const TF_OPTIONS     = [
  { value: 'True',  label: 'True' },
  { value: 'False', label: 'False' },
]

export default function QuestionForm({ bankId, categories, passages = [], initial }: Props) {
  const navigate    = useNavigate()
  const create      = useCreateQuestion(bankId)
  const update      = useUpdateQuestion(bankId)
  const isEdit      = !!initial

  const [text,          setText]          = useState(initial?.text ?? '')
  const [type,          setType]          = useState<QuestionType>(initial?.type ?? 'mcq')
  const [difficulty,    setDifficulty]    = useState<QuestionDifficulty>(initial?.difficulty ?? 'medium')
  const [categoryId,    setCategoryId]    = useState(initial?.category_id ?? (categories[0]?.id ?? ''))
  const [options,       setOptions]       = useState<string[]>(initial?.options ?? ['', '', '', ''])
  const [correctAnswer, setCorrectAnswer] = useState(initial?.correct_answer ?? '')
  const [tags,          setTags]          = useState(initial?.tags?.join(', ') ?? '')
  const [passageId,     setPassageId]     = useState(initial?.passage_id ?? '')

  const updateOption = (i: number, val: string) => {
    setOptions(prev => {
      const next = prev.map((o, idx) => idx === i ? val : o)
      // keep correctAnswer in sync if it pointed to the old text
      if (correctAnswer === prev[i]) setCorrectAnswer(val)
      return next
    })
  }

  const handleSubmit = async () => {
    const payload = {
      category_id:    categoryId,
      text,
      type,
      difficulty,
      options:        (type !== 'open' && type !== 'sentence_completion') ? options.filter(Boolean) : [],
      correct_answer: type !== 'open' ? correctAnswer : '',
      tags:           tags.split(',').map(t => t.trim()).filter(Boolean),
      ...(passageId ? { passage_id: passageId } : {}),
    }
    if (isEdit) {
      await update.mutateAsync({ id: initial!.id, data: payload })
    } else {
      await create.mutateAsync(payload)
    }
    navigate(`/banks/${bankId}`)
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
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Enter the question…"
            rows={3}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Category">
            <Select
              value={categoryId}
              onChange={setCategoryId}
              options={categories.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Select category"
            />
          </FormField>
          <FormField label="Type">
            <Select
              value={type}
              onChange={v => { setType(v as QuestionType); setCorrectAnswer('') }}
              options={TYPE_OPTIONS}
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

        {type === 'mcq' && (
          <div className="flex flex-col gap-3">
            <div className="section-title">Answer Options</div>
            {options.map((opt, i) => (
              <div key={i} className="flex gap-3 items-center">
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: 'var(--gold-dim)', minWidth: 20 }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <Input
                  value={opt}
                  onChange={e => updateOption(i, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                />
                <input
                  type="radio"
                  name="correct"
                  checked={correctAnswer === opt && opt !== ''}
                  onChange={() => setCorrectAnswer(opt)}
                  style={{ accentColor: 'var(--gold)', width: 16, height: 16, flexShrink: 0 }}
                />
              </div>
            ))}
            <p style={{ fontSize: '0.75rem', color: 'var(--ink-dim)' }}>Select the radio button next to the correct answer.</p>
          </div>
        )}

        {type === 'true_false' && (
          <FormField label="Correct Answer">
            <Select
              value={correctAnswer}
              onChange={setCorrectAnswer}
              options={TF_OPTIONS}
              placeholder="— Select —"
            />
          </FormField>
        )}

        {type === 'tf_ng' && (
          <FormField label="Correct Answer">
            <Select
              value={correctAnswer}
              onChange={setCorrectAnswer}
              options={[
                { value: 'True',      label: 'True' },
                { value: 'False',     label: 'False' },
                { value: 'Not Given', label: 'Not Given' },
              ]}
              placeholder="— Select —"
            />
          </FormField>
        )}

        {type === 'sentence_completion' && (
          <FormField label="Correct Answer (the word or phrase that fills the blank)">
            <Input
              value={correctAnswer}
              onChange={e => setCorrectAnswer(e.target.value)}
              placeholder="e.g. industrial revolution"
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--ink-dim)', marginTop: 6 }}>
              Use <code style={{ fontFamily: 'monospace', background: 'rgba(154,112,24,0.08)', padding: '1px 5px' }}>___</code> in the question text above to mark where the blank appears.
            </p>
          </FormField>
        )}

        {passages.length > 0 && (
          <FormField label="Passage (optional)">
            <Select
              value={passageId}
              onChange={setPassageId}
              options={passages.map(p => ({ value: p.id, label: p.title }))}
              placeholder="— Standalone question —"
            />
          </FormField>
        )}

        <FormField label="Tags (comma separated)">
          <Input
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="grammar, vocabulary, n3"
          />
        </FormField>

        <div className="flex gap-3 mt-2">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isPending}>
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
