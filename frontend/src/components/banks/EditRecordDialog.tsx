import { useState, useEffect } from 'react'
import { ConnectError, Code } from '@connectrpc/connect'
import { useQueryClient } from '@tanstack/react-query'
import { Bank, GroupMode } from '../../types'
import { useUpdateBank, useUpdateDefaultConfig } from '../../hooks/useBanks'
import { FormField, Input, Textarea } from '../ui/FormField'

const GROUP_MODES: { value: GroupMode; label: string }[] = [
  { value: 'mixed',      label: 'Mixed' },
  { value: 'standalone', label: 'Standalone' },
  { value: 'groups',     label: 'Groups' },
]

const COUNTS = [
  { key: 'easy_count',   label: 'Easy',   color: 'var(--easy)' },
  { key: 'medium_count', label: 'Medium', color: 'var(--medium)' },
  { key: 'hard_count',   label: 'Hard',   color: 'var(--hard)' },
] as const

type CountKey = typeof COUNTS[number]['key']

export default function EditRecordDialog({ bank, onClose }: { bank: Bank; onClose: () => void }) {
  const qc            = useQueryClient()
  const updateBank    = useUpdateBank()
  const updateConfig  = useUpdateDefaultConfig()
  const id            = String(bank.id)

  const [name,        setName]        = useState(bank.name)
  const [description, setDescription] = useState(bank.description)
  const [counts,      setCounts]      = useState<Record<CountKey, number>>({
    easy_count:   bank.default_config.easy_count,
    medium_count: bank.default_config.medium_count,
    hard_count:   bank.default_config.hard_count,
  })
  const [groupMode,   setGroupMode]   = useState<GroupMode>(bank.default_config.group_mode ?? 'mixed')
  const [error,       setError]       = useState<string | null>(null)

  const pending = updateBank.isPending || updateConfig.isPending

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !pending) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, pending])

  const save = async () => {
    if (!name.trim() || pending) return
    setError(null)
    try {
      await updateBank.mutateAsync({ id, data: { name: name.trim(), description: description.trim() } })
      await updateConfig.mutateAsync({ id, config: { ...bank.default_config, ...counts, group_mode: groupMode } })
      qc.invalidateQueries({ queryKey: ['explore'] })
      onClose()
    } catch (err) {
      if (err instanceof ConnectError && err.code === Code.AlreadyExists) {
        setError(`You already have a record named “${name.trim()}”.`)
      } else {
        setError('Saving failed — please try again.')
      }
    }
  }

  return (
    <div
      onClick={() => !pending && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(43,29,31,0.38)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-record-title"
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(520px, 96vw)', maxHeight: '88vh', overflowY: 'auto',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)',
          borderRadius: 10, boxShadow: '0 20px 60px rgba(43,29,31,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border-dim)' }}>
          <h2 id="edit-record-title" style={{ margin: 0, fontFamily: 'Newsreader, serif', fontSize: '1.4rem', fontWeight: 600 }}>Edit record</h2>
          <button onClick={onClose} disabled={pending} aria-label="Close" className="btn-icon">✕</button>
        </div>

        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormField label="Name">
            <Input value={name} onChange={e => { setName(e.target.value); setError(null) }} autoFocus />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="What's in this record? Shown on the record page and on the community home when public."
            />
          </FormField>

          <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Default test settings</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--ink-dim)', marginTop: 2 }}>Pre-filled on the Generate tab.</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {COUNTS.map(c => (
                <FormField key={c.key} label={c.label}>
                  <Input
                    type="number" min={0} max={200}
                    value={counts[c.key]}
                    onChange={e => setCounts(prev => ({ ...prev, [c.key]: Math.max(0, Number(e.target.value) || 0) }))}
                    style={{ borderLeft: `3px solid ${c.color}` }}
                  />
                </FormField>
              ))}
            </div>
            <FormField label="Questions">
              <div role="group" className="flex gap-1" style={{ background: 'var(--bg)', padding: 3, borderRadius: 8, alignSelf: 'flex-start' }}>
                {GROUP_MODES.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    aria-pressed={groupMode === m.value}
                    onClick={() => setGroupMode(m.value)}
                    style={{
                      fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.82rem',
                      padding: '6px 14px', border: 'none', cursor: 'pointer', borderRadius: 6,
                      background: groupMode === m.value ? 'var(--bg-elevated)' : 'transparent',
                      boxShadow: groupMode === m.value ? '0 1px 2px rgba(43,29,31,0.12)' : 'none',
                      color: groupMode === m.value ? 'var(--ink)' : 'var(--ink-dim)',
                      fontWeight: groupMode === m.value ? 500 : 400,
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </FormField>
          </div>

          {error && (
            <div role="alert" style={{ padding: '10px 14px', background: 'var(--rose-soft)', border: '1px solid var(--rose-border)', borderRadius: 6, fontSize: '0.85rem', color: 'var(--red)' }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border-dim)' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={pending}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={pending || !name.trim()}>{pending ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
