import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Category, Question, QuestionDifficulty, QuestionType } from '../../types'
import { FormField, Input, Select, Textarea } from '../ui/FormField'
import OrnatePanel from '../ui/OrnatePanel'
import { useCreateQuestion, useUpdateQuestion } from '../../hooks/useQuestions'

interface Props {
  bankId: string
  categories: Category[]
  initial?: Question
}

const TYPES: QuestionType[]       = ['mcq', 'true_false', 'open']
const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard']
const TYPE_LABELS: Record<QuestionType, string> = { mcq: 'MCQ', true_false: 'True / False', open: 'Open' }

export default function QuestionForm({ bankId, categories, initial }: Props) {
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

  const updateOption = (i: number, val: string) =>
    setOptions(prev => prev.map((o, idx) => idx === i ? val : o))

  const handleSubmit = async () => {
    const payload = {
      category_id:    categoryId,
      text,
      type,
      difficulty,
      options:        type !== 'open' ? options.filter(Boolean) : [],
      correct_answer: type !== 'open' ? correctAnswer : '',
      tags:           tags.split(',').map(t => t.trim()).filter(Boolean),
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
            <Select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Type">
            <Select value={type} onChange={e => setType(e.target.value as QuestionType)}>
              {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </Select>
          </FormField>
          <FormField label="Difficulty">
            <Select value={difficulty} onChange={e => setDifficulty(e.target.value as QuestionDifficulty)}>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
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
                  checked={correctAnswer === String(i)}
                  onChange={() => setCorrectAnswer(String(i))}
                  style={{ accentColor: 'var(--gold)', width: 16, height: 16 }}
                />
              </div>
            ))}
            <p style={{ fontSize: '0.75rem', color: 'var(--ink-dim)' }}>Select the radio button next to the correct answer.</p>
          </div>
        )}

        {type === 'true_false' && (
          <FormField label="Correct Answer">
            <Select value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)}>
              <option value="">— Select —</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </Select>
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
