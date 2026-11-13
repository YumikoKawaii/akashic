import { useState, useEffect } from 'react'
import { ConnectError, Code } from '@connectrpc/connect'
import { MCQOption, QuestionDifficulty, QuestionGroup } from '../../types'
import { useUpdateQuestionGroup } from '../../hooks/useQuestions'
import { FormField, Input, Textarea } from '../ui/FormField'
import Select from '../ui/Select'

const DIFFICULTIES = [
  { value: 'easy',   label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard' },
]

export default function EditGroupDialog({ bankId, group, onClose }: { bankId: string; group: QuestionGroup; onClose: () => void }) {
  const update = useUpdateQuestionGroup(bankId)

  const [title,        setTitle]        = useState(group.title)
  const [instructions, setInstructions] = useState(group.instructions)
  const [passage,      setPassage]      = useState(group.passage)
  const [options,      setOptions]      = useState<MCQOption[]>(group.options)
  const [difficulty,   setDifficulty]   = useState<QuestionDifficulty>(group.difficulty)
  const [tags,         setTags]         = useState(group.tags.join(', '))
  const [error,        setError]        = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !update.isPending) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, update.isPending])

  const setOption = (i: number, patch: Partial<MCQOption>) =>
    setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, ...patch } : o))

  const save = async () => {
    if (update.isPending) return
    const cleaned = options.map(o => ({ key: o.key.trim(), text: o.text.trim() })).filter(o => o.key || o.text)
    if (cleaned.some(o => !o.key || !o.text)) {
      setError('Every option needs both a key and text.')
      return
    }
    setError(null)
    try {
      await update.mutateAsync({
        id: group.id,
        data: {
          title, instructions, passage, difficulty,
          options: cleaned,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        },
      })
      onClose()
    } catch (err) {
      setError(err instanceof ConnectError && err.code === Code.InvalidArgument
        ? err.rawMessage
        : 'Saving failed — please try again.')
    }
  }

  return (
    <div
      onClick={() => !update.isPending && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(43,29,31,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-group-title"
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(680px, 96vw)', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: 10, boxShadow: '0 20px 60px rgba(43,29,31,0.25)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border-dim)' }}>
          <h2 id="edit-group-title" style={{ margin: 0, fontFamily: 'Newsreader, serif', fontSize: '1.4rem', fontWeight: 600 }}>Edit group</h2>
          <button onClick={onClose} disabled={update.isPending} aria-label="Close" className="btn-icon">✕</button>
        </div>

        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <FormField label="Title">
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Passage title" />
            </FormField>
            <FormField label="Difficulty">
              <Select value={difficulty} onChange={v => setDifficulty(v as QuestionDifficulty)} options={DIFFICULTIES} />
            </FormField>
          </div>
          <FormField label="Instructions">
            <Textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={2} />
          </FormField>
          <FormField label="Passage">
            <Textarea value={passage} onChange={e => setPassage(e.target.value)} rows={8} placeholder="Separate paragraphs with a blank line." />
          </FormField>

          <FormField label="Options">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {options.length === 0 && (
                <div style={{ fontSize: '0.85rem', color: 'var(--ink-dim)' }}>No shared options. Matching questions need these to choose from.</div>
              )}
              {options.map((o, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Input aria-label={`Option ${i + 1} key`} value={o.key} onChange={e => setOption(i, { key: e.target.value })} style={{ width: 70, fontFamily: 'IBM Plex Mono, monospace' }} />
                  <Input aria-label={`Option ${i + 1} text`} value={o.text} onChange={e => setOption(i, { text: e.target.value })} />
                  <button type="button" className="btn-icon" aria-label={`Remove option ${i + 1}`} onClick={() => setOptions(prev => prev.filter((_, idx) => idx !== i))}>✕</button>
                </div>
              ))}
              <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}
                onClick={() => setOptions(prev => [...prev, { key: '', text: '' }])}>＋ Add option</button>
            </div>
          </FormField>

          <FormField label="Tags (comma-separated)">
            <Input value={tags} onChange={e => setTags(e.target.value)} />
          </FormField>

          {error && (
            <div role="alert" style={{ padding: '10px 14px', background: 'var(--rose-soft)', border: '1px solid var(--rose-border)', borderRadius: 6, fontSize: '0.85rem', color: 'var(--red)' }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border-dim)' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={update.isPending}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
