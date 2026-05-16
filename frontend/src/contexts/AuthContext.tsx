import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authApi } from '../api/auth'
import { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  reload: () => Promise<void>
  logout: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  reload: async () => {},
  logout: async () => {},
  login: async () => {},
  register: async () => {},
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

  const login = async (email: string, password: string) => {
    const u = await authApi.login(email, password)
    setUser(u)
  }

  const register = async (email: string, password: string, name: string) => {
    const u = await authApi.register(email, password, name)
    setUser(u)
  }

  return (
    <AuthContext.Provider value={{ user, loading, reload, logout, login, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
