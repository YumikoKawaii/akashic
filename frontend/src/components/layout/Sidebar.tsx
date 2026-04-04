import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBanks, useCreateBank, useDeleteBank } from '../../hooks/useBanks'
import { useLayout } from '../../context/LayoutContext'

export default function Sidebar() {
  const { bankId }  = useParams<{ bankId: string }>()
  const navigate    = useNavigate()
  const { sidebarOpen, closeSidebar } = useLayout()
  const { data: banks = [] } = useBanks()
  const createBank  = useCreateBank()
  const deleteBank  = useDeleteBank()

  const [creating, setCreating] = useState(false)
  const [newName,  setNewName]  = useState('')

  const goTo = (id: string) => {
    navigate(`/banks/${id}`)
    closeSidebar()
  }

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    const bank = await createBank.mutateAsync({ name })
    setCreating(false)
    setNewName('')
    goTo(bank.id)
  }

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (!confirm(`Delete "${name}"? This will remove all questions and tests inside it.`)) return
    await deleteBank.mutateAsync(id)
    if (bankId === id) navigate('/banks')
  }

  return (
    <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Banks</span>
        <button
          onClick={() => { setCreating(v => !v); setNewName('') }}
          style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 2px' }}
          title="New bank"
        >
          ＋
        </button>
      </div>

      {creating && (
        <form onSubmit={submitCreate} style={{ padding: '6px 12px', display: 'flex', gap: 6 }}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Bank name…"
            style={{
              flex: 1,
              background: 'var(--parchment-dark)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              padding: '4px 8px',
              color: 'var(--ink)',
              fontSize: '0.82rem',
              fontFamily: 'EB Garamond, serif',
              outline: 'none',
            }}
            onKeyDown={e => e.key === 'Escape' && setCreating(false)}
          />
          <button
            type="submit"
            disabled={createBank.isPending}
            style={{ background: 'var(--gold)', border: 'none', borderRadius: 3, color: '#1a1208', padding: '4px 10px', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'Cinzel, serif' }}
          >
            {createBank.isPending ? '…' : 'Add'}
          </button>
        </form>
      )}

      {banks.map(b => (
        <div
          key={b.id}
          className={`sidebar-item ${b.id === bankId ? 'active' : ''}`}
          onClick={() => goTo(b.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>⚜</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {b.name}
          </span>
          <button
            onClick={e => handleDelete(e, b.id, b.name)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ink-dim)',
              cursor: 'pointer',
              fontSize: '0.7rem',
              padding: '2px 4px',
              opacity: 0,
              transition: 'opacity 0.15s',
              flexShrink: 0,
            }}
            className="bank-delete-btn"
            title={`Delete ${b.name}`}
          >
            ✕
          </button>
        </div>
      ))}

      {banks.length === 0 && !creating && (
        <div className="sidebar-item" style={{ opacity: 0.5, cursor: 'default', fontSize: '0.8rem' }}>
          No banks yet
        </div>
      )}
    </nav>
  )
}
