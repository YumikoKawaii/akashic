import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import { LayoutProvider } from '../../context/LayoutContext'

export default function Layout() {
  return (
    <LayoutProvider>
      <div className="app-layout">
        <TopBar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </LayoutProvider>
  )
}
