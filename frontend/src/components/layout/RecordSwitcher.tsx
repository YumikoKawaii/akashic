import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBanks } from '../../hooks/useBanks'

// Top-bar dropdown that lists the user's records and jumps between them —
// the navigation half of the old sidebar. Creation lives in TopBar's "New Record".
export default function RecordSwitcher() {
  const navigate    = useNavigate()
  const { bankId }  = useParams<{ bankId: string }>()
  const { data: banks = [] } = useBanks()
  const [open, setOpen] = useState(false)
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
          background: 'none', border: '1px solid var(--border-dim)', borderRadius: 4,
          padding: '5px 12px', cursor: 'pointer',
          fontFamily: 'Cinzel, serif', fontSize: '0.72rem', letterSpacing: '0.08em',
          color: active ? 'var(--gold)' : 'var(--ink-dim)',
        }}
      >
        <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {active?.name ?? 'Records'}
        </span>
        <span style={{ fontSize: '0.6rem', color: 'var(--gold-dim)' }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 60,
          minWidth: 200, maxHeight: 360, overflowY: 'auto',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)',
          borderRadius: 5, boxShadow: '0 8px 24px rgba(154,112,24,0.18)', padding: 4,
        }}>
          {banks.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--ink-dim)' }}>No records yet</div>
          ) : banks.map(b => {
            const isActive = String(b.id) === bankId
            return (
              <button
                key={b.id}
                onClick={() => { navigate(`/banks/${b.id}`); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  background: isActive ? 'linear-gradient(90deg, rgba(200,160,48,0.10), transparent)' : 'none',
                  border: 'none', textAlign: 'left', cursor: 'pointer',
                  padding: '8px 12px', fontSize: '0.85rem', fontFamily: 'EB Garamond, serif',
                  color: isActive ? 'var(--gold)' : 'var(--ink)',
                }}
              >
                <span style={{ width: 12, flexShrink: 0, color: 'var(--gold)' }}>{isActive ? '✦' : ''}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
