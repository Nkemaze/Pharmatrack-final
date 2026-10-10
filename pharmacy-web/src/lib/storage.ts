const TOKEN_KEY = 'pharmatrack-access'
const REFRESH_KEY = 'pharmatrack-refresh'
const USER_KEY = 'pharmatrack-user'

export function readAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function readRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}
export function readUser<T>(): T | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeSession(session: {
  accessToken: string
  refreshToken: string
}): void {
  localStorage.setItem(TOKEN_KEY, session.accessToken)
  localStorage.setItem(REFRESH_KEY, session.refreshToken)
}
export function writeUser(user: unknown): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}
export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}
