import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConnectError, Code } from '@connectrpc/connect'
import { useDeletedBanks, useRestoreBank } from '../../hooks/useBanks'
import Spinner from '../ui/Spinner'

export default function DeletedRecordsDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { data: banks = [], isLoading } = useDeletedBanks()
  const restore = useRestoreBank()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const onRestore = async (id: number, name: string) => {
    setError(null)
    try {
      await restore.mutateAsync(id)
      onClose()
      navigate(`/banks/${id}`)
    } catch (err) {
      setError(err instanceof ConnectError && err.code === Code.AlreadyExists
        ? `You already have a record named “${name}”. Rename that one first.`
        : 'Restoring failed — please try again.')
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(43,29,31,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deleted-records-title"
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(520px, 96vw)', maxHeight: '80vh', overflowY: 'auto', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: 10, boxShadow: '0 20px 60px rgba(43,29,31,0.25)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border-dim)' }}>
          <h2 id="deleted-records-title" style={{ margin: 0, fontFamily: 'Newsreader, serif', fontSize: '1.4rem', fontWeight: 600 }}>Deleted records</h2>
          <button onClick={onClose} aria-label="Close" className="btn-icon">✕</button>
        </div>
        <div style={{ padding: '14px 22px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isLoading ? (
            <div className="flex justify-center" style={{ padding: 24 }}><Spinner /></div>
          ) : banks.length === 0 ? (
            <div style={{ color: 'var(--ink-dim)', fontSize: '0.9rem', padding: '12px 0' }}>No deleted records you own.</div>
          ) : banks.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--border-dim)', borderRadius: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                {b.description && <div style={{ fontSize: '0.82rem', color: 'var(--ink-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.description}</div>}
              </div>
              <button className="btn btn-ghost" disabled={restore.isPending} onClick={() => onRestore(b.id, b.name)}>
                {restore.isPending && restore.variables === b.id ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          ))}
          {error && (
            <div role="alert" style={{ padding: '10px 14px', background: 'var(--rose-soft)', border: '1px solid var(--rose-border)', borderRadius: 6, fontSize: '0.85rem', color: 'var(--red)' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
