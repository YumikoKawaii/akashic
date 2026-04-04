import { createContext, useContext, useState, ReactNode } from 'react'

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
  return (
    <LayoutContext.Provider value={{
      sidebarOpen,
      toggleSidebar: () => setSidebarOpen(v => !v),
      closeSidebar:  () => setSidebarOpen(false),
    }}>
      {children}
    </LayoutContext.Provider>
  )
}

export const useLayout = () => useContext(LayoutContext)
