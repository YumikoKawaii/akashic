import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCategories } from '../hooks/useCategories'
import { useCreatePassage, useUpdatePassage, usePassage } from '../hooks/usePassages'
import { FormField, Input, Textarea } from '../components/ui/FormField'
import Select from '../components/ui/Select'
import OrnatePanel from '../components/ui/OrnatePanel'

const DIFF_OPTIONS = [
  { value: 'easy',   label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard' },
]

export default function PassageFormPage() {
  const { bankId = '', passageId } = useParams<{ bankId: string; passageId?: string }>()
  const navigate                   = useNavigate()
  const { data: categories = [] }  = useCategories(bankId)
  const { data: existing }         = usePassage(bankId, passageId ?? '')
  const create                     = useCreatePassage(bankId)
  const update                     = useUpdatePassage(bankId)

  const isEdit = !!passageId
  if (isEdit && !existing) return (
    <div style={{ color: 'var(--ink-dim)', fontFamily: 'Cinzel, serif', fontSize: '0.8rem', letterSpacing: '0.2em', padding: 40 }}>
      Loading…
    </div>
  )

  const [title,      setTitle]      = useState(existing?.title ?? '')
  const [body,       setBody]       = useState(existing?.body ?? '')
  const [difficulty, setDifficulty] = useState(existing?.difficulty ?? 'medium')
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? (categories[0]?.id ?? ''))

  const isPending = create.isPending || update.isPending

  const handleSubmit = async () => {
    const payload = { title: title.trim(), body, difficulty, category_id: categoryId }
    if (isEdit) {
      await update.mutateAsync({ id: passageId!, data: payload })
    } else {
      await create.mutateAsync(payload)
    }
    navigate(`/banks/${bankId}?tab=passages`)
  }

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
                value={categoryId}
                onChange={setCategoryId}
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                placeholder="Select category"
              />
            </FormField>
            <FormField label="Difficulty">
              <Select value={difficulty} onChange={v => setDifficulty(v as 'easy' | 'medium' | 'hard')} options={DIFF_OPTIONS} />
            </FormField>
          </div>

          <FormField label="Body">
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Paste or type the passage text…"
              rows={12}
            />
          </FormField>

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
    </>
  )
}
