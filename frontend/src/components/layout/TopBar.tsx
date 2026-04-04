import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateBank } from '../../hooks/useBanks'
import { useLayout } from '../../context/LayoutContext'

export default function TopBar() {
  const navigate   = useNavigate()
  const createBank = useCreateBank()
  const { sidebarOpen, toggleSidebar } = useLayout()
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
      </div>
    </header>
  )
}
