import { StatusPill } from './ui'
import type { MovementType } from '@/lib/types'

export function MovementTypeBadge({ type }: { type: MovementType }) {
  const map: Record<MovementType, { label: string; tone: string }> = {
    RECEIPT: { label: 'Receipt', tone: 'success' },
    SALE: { label: 'Sale', tone: 'info' },
    RETURN: { label: 'Return', tone: 'success' },
    TRANSFER: { label: 'Transfer', tone: 'neutral' },
    ADJUSTMENT: { label: 'Adjustment', tone: 'warning' },
    DESTRUCTION: { label: 'Destruction', tone: 'danger' },
    LOSS: { label: 'Loss', tone: 'danger' },
  }
  const { label, tone } = map[type] ?? { label: type, tone: 'neutral' }
  return <StatusPill label={label} tone={tone} />
}

export function ExpiryBadge({ status }: { status: 'HEALTHY' | 'EXPIRING' | 'EXPIRED' | 'NONE' }) {
  const map: Record<string, { label: string; tone: string }> = {
    HEALTHY: { label: 'Healthy', tone: 'success' },
    EXPIRING: { label: 'Expiring', tone: 'warning' },
    EXPIRED: { label: 'Expired', tone: 'danger' },
    NONE: { label: 'No expiry', tone: 'neutral' },
  }
  const { label, tone } = map[status] ?? { label: status, tone: 'neutral' }
  return <StatusPill label={label} tone={tone} />
}

export function SignPill({ sign }: { sign: '+' | '-' | '±' }) {
  const tone = sign === '+' ? 'bg-tertiary-fixed text-on-tertiary-container' : 'bg-error-container text-on-error-container'
  return (
    <span className={`status-pill ${tone}`}>
      {sign === '±' ? '±' : sign}
    </span>
  )
}