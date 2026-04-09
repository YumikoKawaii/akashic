import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authApi } from '../api/auth'
import { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  reload: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  reload: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    try {
      const u = await authApi.me()
      setUser(u)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    await authApi.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, reload, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
