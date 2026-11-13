import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConnectError, Code } from '@connectrpc/connect'
import { useCreateBank } from '../../hooks/useBanks'
import { useAuth } from '../../contexts/AuthContext'
import RecordSwitcher from './RecordSwitcher'

export default function TopBar() {
  const navigate   = useNavigate()
  const createBank = useCreateBank()
  const { user, logout } = useAuth()
  const [creating, setCreating] = useState(false)
  const [name, setName]         = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  const handleCreate = async () => {
    // Guard re-entry: Enter in the input isn't disabled by isPending the way
    // the Confirm button is, so a second Enter would create a duplicate record.
    if (!name.trim() || createBank.isPending) return
    try {
      const bank = await createBank.mutateAsync({ name: name.trim() })
      setName('')
      setCreating(false)
      setCreateError(null)
      navigate(`/banks/${bank.id}`)
    } catch (err) {
      setCreateError(err instanceof ConnectError && err.code === Code.AlreadyExists
        ? 'You already have a record with this name.'
        : 'Creating the record failed — try again.')
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
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                style={{ width: 180, padding: '6px 10px', borderColor: createError ? 'var(--red)' : undefined }}
                placeholder="Record name…"
                aria-label="Record name"
                aria-invalid={!!createError}
                value={name}
                onChange={e => { setName(e.target.value); setCreateError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
              {createError && (
                <div role="alert" style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 70, width: 240,
                  padding: '8px 10px', borderRadius: 6, fontSize: '0.8rem',
                  background: 'var(--rose-soft)', border: '1px solid var(--rose-border)', color: 'var(--red)',
                }}>
                  {createError}
                </div>
              )}
            </div>
            <button className="btn btn-primary" onClick={handleCreate} disabled={createBank.isPending}>
              {createBank.isPending ? '…' : 'Confirm'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setCreating(false); setCreateError(null) }}>✕</button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <span className="hidden sm:inline">＋ New Record</span>
            <span className="sm:hidden">＋</span>
          </button>
        )}

        {user && (
          <div className="flex items-center gap-2" style={{ marginLeft: 8, paddingLeft: 12, borderLeft: '1px solid var(--border-dim)' }}>
            {user.avatar_url && (
              <img src={user.avatar_url} alt={user.name} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border-dim)', flexShrink: 0 }} />
            )}
            <span className="hidden sm:block" style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--ink)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name}
            </span>
            <button className="btn btn-ghost" onClick={logout}>
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">✕</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
