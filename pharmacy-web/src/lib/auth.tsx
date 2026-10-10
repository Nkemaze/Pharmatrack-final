import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, LOGOUT_EVENT } from './api'
import { clearSession, readAccessToken, readRefreshToken, readUser, writeSession, writeUser } from './storage'
import type { Session, User } from './types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (identifier: string, password: string) => Promise<User>
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readUser<User>())
  const [loading, setLoading] = useState<boolean>(() => Boolean(readAccessToken()))

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get<User>('/auth/me')
      if (data) {
        writeUser(data)
        setUser(data)
      }
    } catch {
      clearSession()
      setUser(null)
    }
  }, [])

  useEffect(() => {
    if (readAccessToken()) {
      refreshUser().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [refreshUser])

  useEffect(() => {
    const onLogout = () => {
      setUser(null)
      setLoading(false)
    }
    window.addEventListener(LOGOUT_EVENT, onLogout)
    return () => window.removeEventListener(LOGOUT_EVENT, onLogout)
  }, [])

  const login = useCallback(async (identifier: string, password: string) => {
    const { data } = await api.post<Session>('/auth/login', { identifier, password }, { auth: false })
    writeSession(data)
    writeUser(data.user)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    if (readRefreshToken()) {
      try {
        await api.post<unknown>('/auth/logout')
      } catch {
        /* local cleanup regardless */
      }
    }
    clearSession()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, refreshUser, logout }),
    [user, loading, login, refreshUser, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}