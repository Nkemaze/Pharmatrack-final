import { config } from '@/config'
import {
  clearSession,
  readAccessToken,
  readRefreshToken,
  writeSession,
} from './storage'

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_REQUIRED'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'NEGATIVE_STOCK'
  | 'INVALID_LOSS_REASON'
  | 'OUT_OF_STOCK'
  | 'UNAUTHORIZED'
  | 'INTERNAL_ERROR'

export class ApiError extends Error {
  code: ErrorCode
  status: number
  details?: unknown
  retryAfter?: number

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    details?: unknown,
    retryAfter?: number,
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
    this.retryAfter = retryAfter
  }
}

export const LOGOUT_EVENT = 'pharmatrack:logout'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  auth?: boolean
  query?: Record<string, string | number | boolean | undefined>
}

interface ApiEnvelope<T> {
  data?: T
  meta?: unknown
  code?: ErrorCode
  message?: string
  details?: unknown
  error?: unknown
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${config.apiBaseUrl}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

function toApiError(payload: ApiEnvelope<unknown>, status: number): ApiError {
  const code = (payload?.code ??
    (status === 401 ? 'AUTH_REQUIRED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : status === 422 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR')) as ErrorCode
  const message =
    payload?.message ??
    (status === 422 ? 'Please check the form and try again.' : 'Something went wrong.')
  const retryAfterHeader =
    typeof (payload as unknown as { retryAfter?: number })?.retryAfter === 'number'
      ? (payload as unknown as { retryAfter?: number }).retryAfter
      : undefined
  return new ApiError(code, message, status, payload?.details, retryAfterHeader)
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta?: unknown }> {
  const { method = 'GET', body, auth = true, query } = options

  const doFetch = (token: string | null) => {
    const headers: Record<string, string> = { accept: 'application/json' }
    if (body !== undefined) headers['content-type'] = 'application/json'
    if (auth && token) headers.authorization = `Bearer ${token}`
    return fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  let response = await doFetch(auth ? readAccessToken() : null)

  if (response.status === 401 && auth) {
    const code = await peekErrorCode(response.clone())
    if (code === 'TOKEN_EXPIRED' || code === 'AUTH_REQUIRED') {
      const refreshed = await tryRefresh()
      if (refreshed) {
        response = await doFetch(readAccessToken())
      }
    }
  }

  let payload: ApiEnvelope<T> = {}
  try {
    payload = (await response.json()) as ApiEnvelope<T>
  } catch {
    payload = {}
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearSession()
      window.dispatchEvent(new Event(LOGOUT_EVENT))
    }
    throw toApiError(payload, response.status)
  }

  return { data: payload.data as T, meta: payload.meta }
}

async function peekErrorCode(response: Response): Promise<ErrorCode | null> {
  try {
    const payload = (await response.json()) as ApiEnvelope<never>
    return payload?.code ?? null
  } catch {
    return null
  }
}

let refreshPromise: Promise<boolean> | null = null

export function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = readRefreshToken()
  if (!refreshToken) return false
  try {
    const response = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!response.ok) return false
    const payload = (await response.json()) as ApiEnvelope<{
      accessToken: string
      refreshToken: string
      expiresIn: number
    }>
    if (!payload?.data?.accessToken) return false
    writeSession(payload.data)
    return true
  } catch {
    return false
  }
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  del: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}

export async function downloadCsv(
  path: string,
  filename: string,
  query?: RequestOptions['query'],
): Promise<void> {
  const doFetch = (token: string | null) => {
    const headers: Record<string, string> = {}
    if (token) headers.authorization = `Bearer ${token}`
    return fetch(buildUrl(path, query), { method: 'GET', headers })
  }

  let response = await doFetch(readAccessToken())
  if (response.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed) response = await doFetch(readAccessToken())
  }

  if (!response.ok) {
    let payload: ApiEnvelope<never> = {}
    try {
      payload = (await response.json()) as ApiEnvelope<never>
    } catch {
      payload = {}
    }
    throw toApiError(payload, response.status)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
