import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Icon } from './Icon'

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 text-on-surface-variant">
      <Spinner className="h-7 w-7 text-secondary" />
      <span className="text-body-sm">{label}</span>
    </div>
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outlined' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  loading?: boolean
  icon?: string
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const variants: Record<string, string> = {
    primary: 'bg-primary text-on-primary hover:opacity-90',
    secondary: 'bg-secondary-container text-on-secondary-container hover:opacity-90',
    outlined: 'border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container-low',
    ghost: 'bg-transparent text-secondary hover:bg-surface-container-low',
    danger: 'bg-error text-on-error hover:opacity-90',
  }
  const sizes: Record<string, string> = {
    sm: 'h-8 px-3 text-body-sm gap-1.5',
    md: 'h-10 px-4 text-body-md gap-2',
  }
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <Spinner className="h-4 w-4" />
      ) : (
        icon && <Icon name={icon} size={18} />
      )}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: string
  tone?: 'default' | 'danger'
}

export function IconButton({ label, icon, tone = 'default', className = '', ...rest }: IconButtonProps) {
  const tones = {
    default: 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
    danger: 'text-error hover:bg-error-container',
  }
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${tones[tone]} ${className}`}
      {...rest}
    >
      <Icon name={icon} size={20} />
    </button>
  )
}

interface CardProps {
  children: ReactNode
  className?: string
  as?: 'div' | 'section'
}

export function Card({ children, className = '', as: Tag = 'div' }: CardProps) {
  return (
    <Tag
      className={`rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card ${className}`}
    >
      {children}
    </Tag>
  )
}

export function CardHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-headline-sm">{title}</h2>
        {subtitle && <p className="mt-0.5 text-body-sm text-on-surface-variant">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-display">{title}</h1>
        {description && <p className="mt-1 text-body-md text-on-surface-variant">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatusPill({ label, tone }: { label: string; tone: string }) {
  const tones: Record<string, string> = {
    success: 'bg-tertiary-fixed text-on-tertiary-container',
    info: 'bg-secondary-container text-on-secondary-container',
    warning: 'bg-tertiary-fixed-dim text-on-tertiary-fixed',
    danger: 'bg-error-container text-on-error-container',
    neutral: 'bg-surface-container-high text-on-surface-variant',
  }
  return (
    <span className={`status-pill ${tones[tone] ?? tones.neutral}`}>{label}</span>
  )
}

export function StatusPillForStatus(status: string | undefined): { label: string; tone: string } {
  const map: Record<string, { label: string; tone: string }> = {
    PENDING: { label: 'Pending', tone: 'warning' },
    APPROVED: { label: 'Approved', tone: 'success' },
    SUSPENDED: { label: 'Suspended', tone: 'danger' },
    REJECTED: { label: 'Rejected', tone: 'neutral' },
    ACTIVE: { label: 'Active', tone: 'success' },
    SUSPENDED_USER: { label: 'Suspended', tone: 'danger' },
    healthy: { label: 'Healthy', tone: 'success' },
    expiring: { label: 'Expiring', tone: 'warning' },
    expired: { label: 'Expired', tone: 'danger' },
  }
  return map[status ?? ''] ?? { label: status ?? '', tone: 'neutral' }
}

export function Field({
  label,
  required,
  error,
  hint,
  children,
  className = '',
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="auth-label">
        {label}
        {required && <span className="text-error"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-body-sm text-on-surface-variant">{hint}</span>}
      {error && <span className="mt-1 block text-body-sm text-error">{error}</span>}
    </label>
  )
}

export const inputBase =
  'w-full rounded-lg border bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-secondary/40 disabled:opacity-50'

function inputBorder(hasError: boolean) {
  return hasError ? 'border-error' : 'border-outline-variant'
}

export function Input({
  error,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return <input {...rest} className={`${inputBase} ${inputBorder(Boolean(error))} ${className}`} />
}

export function Select({
  error,
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select {...rest} className={`${inputBase} ${inputBorder(Boolean(error))} ${className}`}>
      {children}
    </select>
  )
}

export function Textarea({
  error,
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return <textarea {...rest} className={`${inputBase} ${inputBorder(Boolean(error))} ${className}`} />
}

export function EmptyState({
  icon,
  title,
  note,
  action,
}: {
  icon: string
  title: string
  note?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-outline bg-surface-container-low px-4 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
        <Icon name={icon} size={24} />
      </div>
      <p className="font-semibold text-on-surface">{title}</p>
      {note && <p className="max-w-sm text-body-sm text-on-surface-variant">{note}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function StatCard({
  icon,
  label,
  value,
  tone = 'secondary',
}: {
  icon: string
  label: string
  value: ReactNode
  tone?: 'secondary' | 'success' | 'warning' | 'danger' | 'neutral'
}) {
  const tones: Record<string, string> = {
    secondary: 'bg-secondary-container text-on-secondary-container',
    success: 'bg-tertiary-fixed text-on-tertiary-container',
    warning: 'bg-tertiary-fixed-dim text-on-tertiary-fixed',
    danger: 'bg-error-container text-on-error-container',
    neutral: 'bg-surface-container-high text-on-surface-variant',
  }
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon name={icon} size={22} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-label-bold uppercase text-on-surface-variant">{label}</p>
        <p className="truncate text-headline-md">{value}</p>
      </div>
    </Card>
  )
}

export function AlertBanner({
  tone,
  children,
  icon,
}: {
  tone: 'info' | 'warning' | 'danger' | 'success'
  children: ReactNode
  icon?: string
}) {
  const tones: Record<string, string> = {
    info: 'bg-secondary-container text-on-secondary-container',
    warning: 'bg-tertiary-fixed-dim text-on-tertiary-fixed',
    danger: 'bg-error-container text-on-error-container',
    success: 'bg-tertiary-fixed text-on-tertiary-container',
  }
  const icons: Record<string, string> = { info: 'info', warning: 'warning', danger: 'error', success: 'check_circle' }
  return (
    <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-body-sm ${tones[tone]}`}>
      <Icon name={icon ?? icons[tone]} size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null
  return <AlertBanner tone="danger">{message}</AlertBanner>
}

export function LinkButton({
  to,
  children,
  variant = 'primary',
  size = 'md',
  icon,
}: {
  to: string
  children: ReactNode
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  icon?: string
}) {
  return (
    <a
      href={to}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors ${size === 'sm' ? 'h-8 px-3 text-body-sm gap-1.5' : 'h-10 px-4 text-body-md gap-2'} ${
        variant === 'primary'
          ? 'bg-primary text-on-primary hover:opacity-90'
          : variant === 'secondary'
            ? 'bg-secondary-container text-on-secondary-container hover:opacity-90'
            : 'border border-outline-variant text-on-surface hover:bg-surface-container-low'
      }`}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </a>
  )
}