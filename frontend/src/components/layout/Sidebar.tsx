import { useNavigate, useParams } from 'react-router-dom'
import { useBanks } from '../../hooks/useBanks'
import { useLayout } from '../../context/LayoutContext'

export default function Sidebar() {
  const { bankId }  = useParams<{ bankId: string }>()
  const navigate    = useNavigate()
  const { sidebarOpen, closeSidebar } = useLayout()
  const { data: banks = [] } = useBanks()

  const goTo = (id: string) => {
    navigate(`/banks/${id}`)
    closeSidebar()
  }

  return (
    <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-section">Banks</div>

      {banks.map(b => (
        <div
          key={b.id}
          className={`sidebar-item ${b.id === bankId ? 'active' : ''}`}
          onClick={() => goTo(b.id)}
        >
          <span style={{ fontSize: '0.85rem' }}>⚜</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {b.name}
          </span>
        </div>
      ))}

      {banks.length === 0 && (
        <div className="sidebar-item" style={{ opacity: 0.5, cursor: 'default', fontSize: '0.8rem' }}>
          No banks yet
        </div>
      )}
    </nav>
  )
}
