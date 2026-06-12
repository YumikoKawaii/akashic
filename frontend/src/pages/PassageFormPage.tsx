import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCategories } from '../hooks/useCategories'
import { useBank } from '../hooks/useBanks'
import { useCreatePassage, useUpdatePassage, usePassage } from '../hooks/usePassages'
import { usePassageQuestions } from '../hooks/useQuestions'
import QuestionCard from '../components/questions/QuestionCard'
import { FormField, Input, Textarea } from '../components/ui/FormField'
import Select from '../components/ui/Select'
import OrnatePanel from '../components/ui/OrnatePanel'
import OrnateDivider from '../components/ui/OrnateDivider'
import { Spinner } from '../components/ui/MagicCircle'
import { Passage, PassageParagraph, Question, QuestionGroup, QuestionDifficulty } from '../types'

const DIFF_OPTIONS = [
  { value: 'easy',   label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard' },
]

const TYPE_LABELS: Record<string, string> = {
  mcq:                  'MCQ',
  tf_ng:                'T/F/NG',
  yn_ng:                'Y/N/NG',
  sentence_completion:  'Sentence Completion',
  form_completion:      'Form Completion',
  short_answer:         'Short Answer',
  matching_headings:    'Matching Headings',
  matching_information: 'Matching Information',
  matching_features:    'Matching Features',
}

const DIFF_COLORS: Record<string, { dot: string; border: string; bg: string }> = {
  easy:   { dot: '#2a8a3a', border: 'rgba(42,138,58,0.45)',  bg: 'rgba(42,138,58,0.07)'  },
  medium: { dot: '#9a7018', border: 'rgba(154,112,24,0.45)', bg: 'rgba(154,112,24,0.07)' },
  hard:   { dot: '#b03030', border: 'rgba(176,48,48,0.45)',  bg: 'rgba(176,48,48,0.07)'  },
}

// Loader wrapper: the form below initialises its state from `existing`, so it
// must not mount until the passage has loaded. Keeping the early return here
// (above a component that owns the useState hooks) keeps hook order stable.
export default function PassageFormPage() {
  const { bankId = '', passageId } = useParams<{ bankId: string; passageId?: string }>()
  const { data: existing, isError } = usePassage(bankId, passageId ?? '')

  const isEdit = !!passageId

  if (isEdit && isError) return (
    <div className="flex items-center justify-center h-full" style={{ flexDirection: 'column', gap: 12, textAlign: 'center' }}>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'var(--ink)' }}>Passage Not Found</div>
      <div style={{ fontSize: '0.88rem', color: 'var(--ink-dim)' }}>This passage could not be loaded — it may have been removed.</div>
    </div>
  )

  if (isEdit && !existing) return (
    <div className="flex items-center justify-center h-full">
      <Spinner />
    </div>
  )

  return <PassageForm key={existing?.id ?? 'new'} bankId={bankId} passageId={passageId} existing={existing} />
}

function PassageForm({ bankId, passageId, existing }: {
  bankId: string; passageId?: string; existing?: Passage
}) {
  const navigate                  = useNavigate()
  const { data: categories = [] } = useCategories(bankId)
  const { data: bank }            = useBank(bankId)
  const create                    = useCreatePassage(bankId)
  const update                    = useUpdatePassage(bankId)

  const canEdit = bank?.my_role === 'owner' || bank?.my_role === 'editor'

  const isEdit = !!passageId
  const { data: questions = [], isLoading: questionsLoading } = usePassageQuestions(bankId, passageId ?? '')

  const [title,      setTitle]      = useState(existing?.title ?? '')
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(existing?.difficulty ?? 'medium')
  const [categoryId, setCategoryId] = useState<number>(existing?.category_id ?? (categories[0]?.id ?? 0))
  const [paragraphs, setParagraphs] = useState<PassageParagraph[]>(existing?.paragraphs ?? [])
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Categories usually load after mount on the "new" page — adopt the first one
  // once they arrive so the Save button isn't stuck disabled on category_id 0.
  useEffect(() => {
    if (!categoryId && categories.length) setCategoryId(categories[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories])

  // Group the passage's questions by their question-group, in document order.
  const grouped = useMemo(() => {
    const m = new Map<number, { group?: QuestionGroup; questions: Question[] }>()
    for (const q of questions) {
      const key = q.group_id ?? 0
      if (!m.has(key)) m.set(key, { group: q.group, questions: [] })
      m.get(key)!.questions.push(q)
    }
    return [...m.values()]
  }, [questions])

  const isPending = create.isPending || update.isPending

  const setParagraph = (i: number, patch: Partial<PassageParagraph>) =>
    setParagraphs(ps => ps.map((p, idx) => idx === i ? { ...p, ...patch } : p))
  const addParagraph = () =>
    setParagraphs(ps => [...ps, { label: String.fromCharCode(65 + ps.length), text: '' }])
  const removeParagraph = (i: number) =>
    setParagraphs(ps => ps.filter((_, idx) => idx !== i))

  const handleSubmit = async () => {
    if (isPending) return
    setSubmitError(null)
    const payload = {
      title:       title.trim(),
      difficulty,
      category_id: categoryId,
      paragraphs:  paragraphs.filter(p => p.text.trim()),
    }
    try {
      if (isEdit) {
        await update.mutateAsync({ id: passageId!, data: payload })
      } else {
        await create.mutateAsync(payload)
      }
      navigate(`/banks/${bankId}?tab=passages`)
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Saving failed — please try again.')
    }
  }

  let questionIndex = 0

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit' : 'New'} — <span>Passage</span></h1>
        </div>
      </div>

      <OrnatePanel>
        <div className="section-title" style={{ marginBottom: 20 }}>
          {isEdit ? 'Edit Passage' : 'New Passage'}
        </div>

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Title">
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Passage title" />
            </FormField>
            <FormField label="Category">
              <Select
                value={String(categoryId)}
                onChange={v => setCategoryId(Number(v))}
                options={categories.map(c => ({ value: String(c.id), label: c.name }))}
                placeholder="Select category"
              />
            </FormField>
            <FormField label="Difficulty">
              <Select value={difficulty} onChange={v => setDifficulty(v as QuestionDifficulty)} options={DIFF_OPTIONS} />
            </FormField>
          </div>

          {/* ── Paragraphs ──────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <div className="section-title" style={{ marginBottom: 0 }}>
                Paragraphs ({paragraphs.length})
              </div>
              <button className="btn btn-ghost" onClick={addParagraph} style={{ fontSize: '0.62rem', padding: '4px 12px' }}>
                ＋ Add Paragraph
              </button>
            </div>

            {paragraphs.length === 0 ? (
              <div style={{ color: 'var(--ink-dim)', fontSize: '0.85rem', padding: '14px 0' }}>
                No paragraphs yet — add the passage text section by section.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {paragraphs.map((p, i) => (
                  <div key={i} style={{ border: '1px solid var(--border-dim)', background: 'var(--bg-card)', padding: '12px 14px' }}>
                    <div className="flex items-center gap-3" style={{ marginBottom: 8 }}>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--ink-dim)', textTransform: 'uppercase' }}>
                        Label
                      </span>
                      <Input
                        value={p.label}
                        onChange={e => setParagraph(i, { label: e.target.value })}
                        placeholder="A"
                        style={{ width: 70 }}
                      />
                      <button
                        className="btn-danger"
                        style={{ marginLeft: 'auto' }}
                        onClick={() => removeParagraph(i)}
                        title="Remove paragraph"
                      >
                        ✕
                      </button>
                    </div>
                    <Textarea
                      value={p.text}
                      onChange={e => setParagraph(i, { text: e.target.value })}
                      placeholder="Paragraph text…"
                      rows={5}
                      style={{ width: '100%', resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {submitError && (
            <div style={{ padding: '10px 14px', background: 'rgba(176,48,48,0.06)', border: '1px solid rgba(176,48,48,0.3)', fontSize: '0.85rem', color: '#b03030' }}>
              {submitError}
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button className="btn btn-primary" onClick={handleSubmit} disabled={isPending || !title.trim() || !categoryId}>
              {isPending ? '…' : isEdit ? '⚔ Save Changes' : '⚔ Create Passage'}
            </button>
            <button className="btn btn-ghost" onClick={() => navigate(`/banks/${bankId}?tab=passages`)}>
              Cancel
            </button>
          </div>
        </div>
      </OrnatePanel>

      {/* ── Questions of this passage ─────────────────────────────── */}
      {isEdit && (
        <div style={{ marginTop: 28 }}>
          <OrnateDivider />
          <div className="section-title" style={{ marginBottom: 14 }}>
            Questions ({questions.length})
          </div>

          {questionsLoading ? (
            <div className="flex items-center justify-center" style={{ padding: '30px 0' }}>
              <Spinner />
            </div>
          ) : grouped.length === 0 ? (
            <div style={{ color: 'var(--ink-dim)', fontSize: '0.88rem', padding: '14px 0' }}>
              No questions are attached to this passage yet.
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {grouped.map(({ group, questions: qs }, gi) => {
                const dc = DIFF_COLORS[group?.difficulty ?? 'medium'] ?? DIFF_COLORS.medium
                return (
                  <div key={group?.id ?? `g${gi}`}>
                    <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 10 }}>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', letterSpacing: '0.1em', color: 'var(--ink)' }}>
                        Group {gi + 1}
                      </span>
                      {group && (
                        <>
                          <span style={{ fontSize: '0.6rem', padding: '1px 7px', border: '1px solid var(--border-dim)', color: 'var(--ink-dim)', fontFamily: 'Cinzel, serif', letterSpacing: '0.08em' }}>
                            {TYPE_LABELS[group.type] ?? group.type}
                          </span>
                          <span style={{ fontSize: '0.6rem', padding: '1px 7px', border: `1px solid ${dc.border}`, color: dc.dot, fontFamily: 'Cinzel, serif', letterSpacing: '0.08em', background: dc.bg }}>
                            {group.difficulty}
                          </span>
                        </>
                      )}
                      <span style={{ fontSize: '0.7rem', color: 'var(--ink-dim)' }}>
                        {qs.length} question{qs.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {qs.map(q => <QuestionCard key={q.id} question={q} index={questionIndex++} bankId={bankId} canEdit={canEdit} />)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </>
  )
}
