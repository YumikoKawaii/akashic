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

const TYPE_OPTIONS = [
  { value: 'mcq',                  label: 'MCQ' },
  { value: 'true_false',           label: 'True / False' },
  { value: 'open',                 label: 'Open' },
  { value: 'tf_ng',                label: 'T / F / Not Given' },
  { value: 'sentence_completion',  label: 'Fill in Blank' },
  { value: 'word_bank_completion', label: 'Word Bank Completion' },
  { value: 'matching',             label: 'Matching' },
  { value: 'multi_select',         label: 'Multi Select' },
]
const DIFF_OPTIONS = [
  { value: 'easy',   label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard' },
]

const TYPES_WITH_OPTIONS: QuestionType[] = ['mcq', 'word_bank_completion', 'matching', 'multi_select']

export default function QuestionForm({ bankId, categories, passages = [], initial }: Props) {
  const navigate    = useNavigate()
  const create      = useCreateQuestion(bankId)
  const update      = useUpdateQuestion(bankId)
  const isEdit      = !!initial

  const [text,          setText]          = useState(initial?.text ?? '')
  const [type,          setType]          = useState<QuestionType>(initial?.type ?? 'mcq')
  const [difficulty,    setDifficulty]    = useState<QuestionDifficulty>(initial?.difficulty ?? 'medium')
  const [categoryId,    setCategoryId]    = useState(initial?.category_id ?? (categories[0]?.id ?? ''))
  const [options,       setOptions]       = useState<string[]>(initial?.options?.length ? initial.options : ['', '', '', ''])
  const [correctAnswer, setCorrectAnswer] = useState(initial?.correct_answer ?? '')
  const [tags,          setTags]          = useState(initial?.tags?.join(', ') ?? '')
  const [passageId,     setPassageId]     = useState(initial?.passage_id ?? '')

  const addOption    = () => setOptions(prev => [...prev, ''])
  const removeOption = (i: number) => {
    setOptions(prev => {
      const removed = prev[i]
      const next = prev.filter((_, idx) => idx !== i)
      if (type === 'multi_select') {
        const parts = correctAnswer.split('|').map(p => p.trim()).filter(p => p !== removed)
        setCorrectAnswer(parts.join('|'))
      } else if (correctAnswer === removed) {
        setCorrectAnswer('')
      }
      return next
    })
  }

  const updateOption = (i: number, val: string) => {
    setOptions(prev => {
      const oldVal = prev[i]
      const next = prev.map((o, idx) => idx === i ? val : o)
      if (type === 'multi_select') {
        const parts = correctAnswer.split('|').map(p => p.trim())
        const corrIdx = parts.indexOf(oldVal)
        if (corrIdx !== -1) { parts[corrIdx] = val; setCorrectAnswer(parts.join('|')) }
      } else if (correctAnswer === oldVal) {
        setCorrectAnswer(val)
      }
      return next
    })
  }

  const toggleMultiCorrect = (opt: string) => {
    const parts = correctAnswer.split('|').map(p => p.trim()).filter(Boolean)
    const idx = parts.indexOf(opt)
    if (idx !== -1) parts.splice(idx, 1)
    else parts.push(opt)
    setCorrectAnswer(parts.join('|'))
  }
  const isMultiCorrect = (opt: string) =>
    correctAnswer.split('|').map(p => p.trim()).includes(opt)

  const handleSubmit = async () => {
    const payload = {
      category_id:    categoryId,
      text,
      type,
      difficulty,
      options:        TYPES_WITH_OPTIONS.includes(type) ? options.filter(Boolean) : [],
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

  const optionsLabel =
    type === 'word_bank_completion' ? 'Word Bank' :
    type === 'matching'             ? 'Match Targets' : 'Answer Options'

  const validOptions = options.filter(Boolean)

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
            placeholder={
              type === 'sentence_completion' || type === 'word_bank_completion'
                ? 'Use ___ to mark the blank…'
                : 'Enter the question…'
            }
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

        {/* Options editor — shared for mcq, word_bank_completion, matching, multi_select */}
        {TYPES_WITH_OPTIONS.includes(type) && (
          <div className="flex flex-col gap-3">
            <div className="section-title">{optionsLabel}</div>
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
                {type === 'mcq' && (
                  <input
                    type="radio"
                    name="correct"
                    checked={correctAnswer === opt && opt !== ''}
                    onChange={() => setCorrectAnswer(opt)}
                    style={{ accentColor: 'var(--gold)', width: 16, height: 16, flexShrink: 0 }}
                  />
                )}
                {type === 'multi_select' && (
                  <input
                    type="checkbox"
                    checked={isMultiCorrect(opt) && opt !== ''}
                    onChange={() => opt && toggleMultiCorrect(opt)}
                    style={{ accentColor: 'var(--gold)', width: 16, height: 16, flexShrink: 0 }}
                  />
                )}
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(i)}
                    style={{ color: 'var(--ink-dim)', fontSize: '0.8rem', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}
                  >✕</button>
                )}
              </div>
            ))}
            <button
              className="btn btn-ghost"
              onClick={addOption}
              style={{ alignSelf: 'flex-start', fontSize: '0.8rem', padding: '4px 12px' }}
            >
              + Add option
            </button>
            {type === 'mcq' && (
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-dim)' }}>Select the radio button next to the correct answer.</p>
            )}
            {type === 'multi_select' && (
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-dim)' }}>Check all correct answers.</p>
            )}
          </div>
        )}

        {/* Correct answer — types where it's a dropdown of the entered options */}
        {(type === 'word_bank_completion' || type === 'matching') && (
          <FormField label="Correct Answer">
            <Select
              value={correctAnswer}
              onChange={setCorrectAnswer}
              options={validOptions.map(o => ({ value: o, label: o }))}
              placeholder="— Select the correct option —"
            />
          </FormField>
        )}

        {type === 'true_false' && (
          <FormField label="Correct Answer">
            <Select
              value={correctAnswer}
              onChange={setCorrectAnswer}
              options={[{ value: 'True', label: 'True' }, { value: 'False', label: 'False' }]}
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
              Use <code style={{ fontFamily: 'monospace', background: 'rgba(154,112,24,0.08)', padding: '1px 5px' }}>___</code> in the question text to mark the blank. Grading is case-insensitive.
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
