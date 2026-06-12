import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateBank } from '../../hooks/useBanks'
import { useAuth } from '../../contexts/AuthContext'
import RecordSwitcher from './RecordSwitcher'

export default function TopBar() {
  const navigate   = useNavigate()
  const createBank = useCreateBank()
  const { user, logout } = useAuth()
  const [creating, setCreating] = useState(false)
  const [name, setName]         = useState('')
  const [createError, setCreateError] = useState(false)

  const handleCreate = async () => {
    // Guard re-entry: Enter in the input isn't disabled by isPending the way
    // the Confirm button is, so a second Enter would create a duplicate record.
    if (!name.trim() || createBank.isPending) return
    try {
      const bank = await createBank.mutateAsync({ name: name.trim() })
      setName('')
      setCreating(false)
      setCreateError(false)
      navigate(`/banks/${bank.id}`)
    } catch {
      setCreateError(true)
    }
  }

  return (
    <header className="topbar">
      <span
        className="topbar-logo"
        onClick={() => navigate('/')}
        style={{ cursor: 'pointer' }}
        role="link"
        aria-label="Home"
        title="Home"
      >
        Akashic
      </span>
      <div className="topbar-divider" />
      <span className="topbar-subtitle">Knowledge Archive</span>
      <div className="topbar-divider" />
      <RecordSwitcher />

      <div className="ml-auto flex items-center gap-3">
        {creating ? (
          <>
            <input
              className="form-input"
              style={{ width: 160, padding: '6px 10px', borderColor: createError ? '#b03030' : undefined }}
              placeholder="Record name…"
              title={createError ? 'Creating the record failed — try again.' : undefined}
              value={name}
              onChange={e => { setName(e.target.value); setCreateError(false) }}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <button className="btn btn-primary" onClick={handleCreate} disabled={createBank.isPending}>
              {createBank.isPending ? '…' : 'Confirm'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setCreating(false); setCreateError(false) }}>✕</button>
          </>
        ) : (
          <button className="btn btn-primary pulse" onClick={() => setCreating(true)}>
            <span className="hidden sm:inline">＋ New Record</span>
            <span className="sm:hidden">＋</span>
          </button>
        )}

        {user && (
          <div className="flex items-center gap-2" style={{ marginLeft: 8, paddingLeft: 12, borderLeft: '1px solid var(--border-dim)' }}>
            {user.avatar_url && (
              <img src={user.avatar_url} alt={user.name} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border-dim)', flexShrink: 0 }} />
            )}
            <span className="hidden sm:block" style={{ fontFamily: 'Cinzel, serif', fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--ink-dim)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name}
            </span>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.6rem' }} onClick={logout}>
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">✕</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
