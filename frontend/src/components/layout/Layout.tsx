import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import Starfield from '../ui/Starfield'
import { MagicCircleBackground } from '../ui/MagicCircle'
import { LayoutProvider } from '../../context/LayoutContext'

export default function Layout() {
  return (
    <LayoutProvider>
      <Starfield />
      <MagicCircleBackground leftOffset={0} />
      <div className="app-layout">
        <TopBar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </LayoutProvider>
  )
}
