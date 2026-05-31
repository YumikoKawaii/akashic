import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import Starfield from '../ui/Starfield'
import { MagicCircleBackground } from '../ui/MagicCircle'
import { LayoutProvider } from '../../context/LayoutContext'

// Home uses TopBar-only chrome — a focused, full-width landing with no sidebar.
export default function HomeLayout() {
  return (
    <LayoutProvider>
      <Starfield />
      <MagicCircleBackground leftOffset={0} />
      <div style={{ display: 'grid', gridTemplateRows: '56px 1fr', height: '100dvh', position: 'relative', zIndex: 1 }}>
        <TopBar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </LayoutProvider>
  )
}
