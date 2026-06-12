import { useState, useEffect } from 'react'
import { ConnectError, Code } from '@connectrpc/connect'
import { useMembers, useAddMember, useRemoveMember } from '../../hooks/useBanks'
import { useAuth } from '../../contexts/AuthContext'
import { FormField, Input } from '../ui/FormField'

// Centered modal for managing record membership. Replaces the old anchored
// OrnatePanel popover, which overflowed the viewport and let its corner
// ornaments bleed over the member list.
export default function ShareRecordDialog({ bankId, onClose }: { bankId: string; onClose: () => void }) {
  const { user }               = useAuth()
  const { data: members = [] } = useMembers(bankId)
  const addMember              = useAddMember(bankId)
  const removeMember           = useRemoveMember(bankId)

  const [email, setEmail] = useState('')
  const [role,  setRole]  = useState<'viewer' | 'editor'>('viewer')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async () => {
    if (!email.trim() || addMember.isPending) return
    try {
      await addMember.mutateAsync({ email: email.trim(), role })
      setEmail('')
      setError(null)
    } catch (err) {
      // Don't blame the email for every failure — only NotFound means that.
      if (err instanceof ConnectError && err.code === Code.NotFound) {
        setError('No user with that email — they must sign in once first.')
      } else if (err instanceof ConnectError && err.code === Code.AlreadyExists) {
        setError('That user is already a member of this record.')
      } else {
        setError('Adding the member failed — please try again.')
      }
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(30,21,8,0.38)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(520px, 96vw)', maxHeight: '88vh', overflowY: 'auto',
          background: 'var(--bg-elevated)', border: '1px solid var(--gold-dim)',
          borderRadius: 6, boxShadow: '0 20px 60px rgba(30,21,8,0.35)', position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border-dim)' }}>
          <span className="section-title" style={{ marginBottom: 0 }}>Share Record</span>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-dim)', fontSize: '1rem', lineHeight: 1 }}>✕</button>
        </div>

        {/* Add member */}
        <div style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <FormField label="Email">
              <Input
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null) }}
                placeholder="name@example.com"
                type="email"
                style={{ width: 230 }}
              />
            </FormField>
            <FormField label="Role">
              <div className="flex gap-1" style={{ border: '1px solid var(--border-dim)', padding: 3, borderRadius: 4 }}>
                {(['viewer', 'editor'] as const).map(r => (
                  <button key={r} onClick={() => setRole(r)} style={{
                    fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.1em',
                    padding: '5px 12px', border: 'none', cursor: 'pointer', borderRadius: 2,
                    background: role === r ? 'var(--gold-dim)' : 'transparent',
                    color: role === r ? 'var(--bg)' : 'var(--ink-dim)',
                    textTransform: 'uppercase',
                  }}>
                    {r}
                  </button>
                ))}
              </div>
            </FormField>
            <button className="btn btn-primary" disabled={!email.trim() || addMember.isPending} onClick={submit}>
              {addMember.isPending ? '…' : '＋ Add'}
            </button>
          </div>
          {error && <div style={{ fontSize: '0.8rem', color: '#b03030', marginTop: 10 }}>{error}</div>}
        </div>

        {/* Members */}
        <div style={{ padding: '0 22px 20px' }}>
          <div className="section-title" style={{ marginBottom: 12 }}>Members ({members.length})</div>
          <div className="flex flex-col">
            {members.map(m => (
              <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border-dim)' }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ color: 'var(--ink)' }}>{m.user?.name}</span>
                  <span style={{ color: 'var(--ink-dim)', marginLeft: 8, fontSize: '0.78rem' }}>{m.user?.email}</span>
                </div>
                <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.55rem', letterSpacing: '0.12em', color: m.role === 'owner' ? 'var(--gold)' : 'var(--gold-dim)', textTransform: 'uppercase' }}>{m.role}</span>
                  {m.user_id !== user?.id && m.role !== 'owner' && (
                    <button className="btn-danger" style={{ fontSize: '0.6rem', padding: '2px 6px' }} disabled={removeMember.isPending} onClick={() => removeMember.mutate(m.user_id)}>✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
