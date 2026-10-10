export type Role = 'PHARMACY' | 'ADMIN'

export interface Pharmacy {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  city?: string | null
  address?: string | null
  state?: string | null
  zipCode?: string | null
  emergencyPhone?: string | null
  emergencyDesc?: string | null
  latitude?: string | null
  longitude?: string | null
  openingHours?: {
    weekdayOpen?: string | null
    weekdayClose?: string | null
    weekendOpen?: string | null
    weekendClose?: string | null
  } | null
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED' | 'DELETED'
  createdAt?: string
  updatedAt?: string
  applicant?: Array<{ id: string; name: string; email: string; status?: string }>
}

export interface User {
  id: string
  name: string
  email?: string | null
  role: Role
  pharmacyId?: string | null
  mustUpdateProfile?: boolean
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED' | 'DELETED'
  createdAt?: string
  updatedAt?: string
  pharmacy?: Pharmacy | null
}

export interface Session {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: User
}

export interface Product {
  id: string
  pharmacyId: string
  name: string
  category?: string | null
  strength?: string | null
  dosageForm?: string | null
  barcode?: string | null
  requiresPrescription: boolean
  isControlled: boolean
  pricePerUnit?: string | null
  pricePerPacket?: string | null
  packetSize?: number | null
  unitLabel: string
  imageUrl?: string | null
  lowStockThreshold?: number | null
  totalStock: number
  isLowStock: boolean
  batchCount: number
  expiry: {
    status: 'HEALTHY' | 'EXPIRING' | 'EXPIRED' | 'NONE'
    daysToExpiry?: number | null
    minExpiryDate?: string | null
  }
  createdAt?: string
  updatedAt?: string
}

export interface Batch {
  id: string
  batchNumber?: string | null
  expiryDate?: string | null
  receivedAt?: string | null
  remaining: number
}

export type MovementType =
  | 'RECEIPT'
  | 'SALE'
  | 'RETURN'
  | 'TRANSFER'
  | 'ADJUSTMENT'
  | 'DESTRUCTION'
  | 'LOSS'
export type AdjustmentDirection = 'INCREASE' | 'DECREASE'

export interface Movement {
  id: string
  batchId: string
  product?: { id: string | null; name: string | null } | null
  type: MovementType
  quantity: number
  direction?: AdjustmentDirection | null
  counterpartyName?: string | null
  counterpartyAddress?: string | null
  referenceNumber?: string | null
  prescriptionNumber?: string | null
  reason?: string | null
  performedBy?: { id: string; name: string } | null
  occurredAt: string
  recordedAt?: string
}

export interface LossReport {
  id: string
  date?: string | null
  productName: string | null
  batchNumber: string | null
  quantity: number | null
  reason?: string | null
  reported: boolean
  reportedToAuthorityAt?: string | null
  authorityReference?: string | null
}

export interface DashboardData {
  totals: { products: number; batches: number }
  lowStock: Product[]
  expired: Product[]
  expiringSoon: Product[]
  recentMovements: Movement[]
}

export interface ListMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export const MOVEMENT_TYPES: { value: MovementType; label: string; sign: '+' | '-' | '±' }[] = [
  { value: 'RECEIPT', label: 'Receipt', sign: '+' },
  { value: 'SALE', label: 'Sale', sign: '-' },
  { value: 'RETURN', label: 'Return', sign: '+' },
  { value: 'TRANSFER', label: 'Transfer', sign: '-' },
  { value: 'ADJUSTMENT', label: 'Adjustment', sign: '±' },
  { value: 'DESTRUCTION', label: 'Destruction', sign: '-' },
  { value: 'LOSS', label: 'Loss', sign: '-' },
]