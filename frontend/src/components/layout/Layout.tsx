import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import Starfield from '../ui/Starfield'
import { LayoutProvider, useLayout } from '../../context/LayoutContext'

function LayoutInner() {
  const { sidebarOpen, closeSidebar } = useLayout()
  const location = useLocation()

  // Close sidebar on navigation
  useEffect(() => { closeSidebar() }, [location.pathname, closeSidebar])

  return (
    <>
      <Starfield />
      <div className="app-layout">
        <TopBar />
        <Sidebar />
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={closeSidebar} />
        )}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </>
  )
}

export default function Layout() {
  return (
    <LayoutProvider>
      <LayoutInner />
    </LayoutProvider>
  )
}
