import { config } from '@/config'

const currencyFmt = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return String(value)
  return `${currencyFmt.format(n)} ${config.currency}`
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0'
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

export function formatDistance(km: number | string | null | undefined): string {
  if (km === null || km === undefined || km === '') return '—'
  const n = typeof km === 'string' ? Number(km) : km
  if (Number.isNaN(n)) return '—'
  return `${n.toFixed(1)} km`
}

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null
  const target = new Date(date).getTime()
  if (Number.isNaN(target)) return null
  const now = Date.now()
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

export function toLocalInputValue(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function toIsoDate(dateValue: string | null | undefined): string | undefined {
  if (!dateValue) return undefined
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}
