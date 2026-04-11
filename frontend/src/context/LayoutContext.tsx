import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface LayoutContextType {
  sidebarOpen: boolean
  toggleSidebar: () => void
  closeSidebar: () => void
}

const LayoutContext = createContext<LayoutContextType>({
  sidebarOpen: false,
  toggleSidebar: () => {},
  closeSidebar:  () => {},
})

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const toggleSidebar = useCallback(() => setSidebarOpen(v => !v), [])
  const closeSidebar  = useCallback(() => setSidebarOpen(false), [])
  return (
    <LayoutContext.Provider value={{ sidebarOpen, toggleSidebar, closeSidebar }}>
      {children}
    </LayoutContext.Provider>
  )
}

export const useLayout = () => useContext(LayoutContext)
