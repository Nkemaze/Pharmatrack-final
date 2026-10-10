const env = import.meta.env as Record<string, string | undefined>

export const config = {
  apiBaseUrl: env.VITE_API_BASE_URL ?? 'http://127.0.0.1:5000/api/v1',
  appName: 'PharmaTrack',
  currency: 'FCFA',
} as const
