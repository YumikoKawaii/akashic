import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateBank } from '../../hooks/useBanks'
import { useLayout } from '../../context/LayoutContext'
import { useAuth } from '../../contexts/AuthContext'

export default function TopBar() {
  const navigate   = useNavigate()
  const createBank = useCreateBank()
  const { sidebarOpen, toggleSidebar } = useLayout()
  const { user, logout } = useAuth()
  const [creating, setCreating] = useState(false)
  const [name, setName]         = useState('')

  const handleCreate = async () => {
    if (!name.trim()) return
    const bank = await createBank.mutateAsync({ name: name.trim() })
    setName('')
    setCreating(false)
    navigate(`/banks/${bank.id}`)
  }

  return (
    <header className="topbar">
      <button
        className={`hamburger ${sidebarOpen ? 'open' : ''}`}
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <span /><span /><span />
      </button>

      <span className="topbar-logo">Akashic</span>
      <div className="topbar-divider" />
      <span className="topbar-subtitle">Knowledge Archive</span>

      <div className="ml-auto flex items-center gap-3">
        {creating ? (
          <>
            <input
              className="form-input"
              style={{ width: 160, padding: '6px 10px' }}
              placeholder="Bank name…"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <button className="btn btn-primary" onClick={handleCreate} disabled={createBank.isPending}>
              Confirm
            </button>
            <button className="btn btn-ghost" onClick={() => setCreating(false)}>✕</button>
          </>
        ) : (
          <button className="btn btn-primary pulse" onClick={() => setCreating(true)}>
            <span className="hidden sm:inline">＋ New Bank</span>
            <span className="sm:hidden">＋</span>
          </button>
        )}

        {user && (
          <div className="flex items-center gap-2" style={{ marginLeft: 8, paddingLeft: 12, borderLeft: '1px solid var(--border-dim)' }}>
            {user.avatar_url && (
              <img src={user.avatar_url} alt={user.name} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border-dim)' }} />
            )}
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--ink-dim)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name}
            </span>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.6rem' }} onClick={logout}>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
