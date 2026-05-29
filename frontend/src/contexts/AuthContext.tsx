import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authClient, getToken, clearToken } from '../api/connect'
import type { User } from '../types'

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

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  const reload = async () => {
    if (!getToken()) {
      setUser(null)
      return
    }
    try {
      const res = await authClient.getMe({})
      const u = res.user!
      setUser({ id: u.id, email: u.email, name: u.name, avatar_url: u.avatarUrl })
    } catch {
      clearToken()
      setUser(null)
    }
  }

  const logout = async () => {
    try { await authClient.logout({}) } catch { /* noop */ }
    clearToken()
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
