import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBanks } from '../../hooks/useBanks'
import DeletedRecordsDialog from '../banks/DeletedRecordsDialog'

// Top-bar dropdown that lists the user's records and jumps between them —
// the navigation half of the old sidebar. Creation lives in TopBar's "New Record".
export default function RecordSwitcher() {
  const navigate    = useNavigate()
  const { bankId }  = useParams<{ bankId: string }>()
  const { data: banks = [] } = useBanks()
  const [open, setOpen] = useState(false)
  const [trashOpen, setTrashOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const active = banks.find(b => String(b.id) === bankId)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Switch record"
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: 6,
          height: 36, padding: '0 12px', cursor: 'pointer',
          fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '0.88rem', fontWeight: 500,
          color: 'var(--ink)',
        }}
      >
        <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {active?.name ?? 'Records'}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 4.5l3 3 3-3" stroke="var(--ink-dim)" strokeWidth="1.4" strokeLinecap="round" /></svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 60,
          minWidth: 200, maxHeight: 360, overflowY: 'auto',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)',
          borderRadius: 8, boxShadow: '0 10px 28px rgba(43,29,31,0.12)', padding: 6,
        }}>
          {banks.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--ink-dim)' }}>No records yet</div>
          ) : banks.map((b, idx) => {
            const isActive = String(b.id) === bankId
            return (
              <div key={b.id}>
                {idx > 0 && <div className="dropdown-sep" />}
                <button
                  onClick={() => { navigate(`/banks/${b.id}`); setOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    background: isActive ? 'var(--rose-soft)' : 'none', borderRadius: 5,
                    border: 'none', textAlign: 'left', cursor: 'pointer',
                    padding: '9px 12px', fontSize: '0.9rem', fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: isActive ? 500 : 400,
                    color: isActive ? 'var(--gold)' : 'var(--ink)',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isActive ? 'var(--gold)' : 'transparent' }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                </button>
              </div>
            )
          })}
          <div className="dropdown-sep" />
          <button
            onClick={() => { setOpen(false); setTrashOpen(true) }}
            style={{
              display: 'block', width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
              padding: '9px 12px', borderRadius: 5, fontSize: '0.85rem', fontFamily: 'IBM Plex Sans, sans-serif', color: 'var(--ink-dim)',
            }}
          >
            Deleted records…
          </button>
        </div>
      )}
      {trashOpen && <DeletedRecordsDialog onClose={() => setTrashOpen(false)} />}
    </div>
  )
}
