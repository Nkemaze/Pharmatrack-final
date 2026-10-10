import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { useTheme } from '@/lib/theme'

export function AuthShell({
  title,
  children,
  footer,
}: {
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  const { theme, toggle } = useTheme()
  return (
    <div className="auth-shell">
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />
      <div className="auth-blob auth-blob-3" />

      <div className="absolute right-4 top-4 z-10">
        <button
          type="button"
          onClick={toggle}
          title="Toggle theme"
          aria-label="Toggle theme"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant shadow-card hover:bg-surface-container-low"
        >
          <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} />
        </button>
      </div>

      <div className="auth-card">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="auth-brand-logo">
            <Icon name="local_pharmacy" size={26} />
          </div>
          <h1 className="mt-3 text-headline-md">{title}</h1>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-headline-sm font-bold text-primary">PharmaTrack</span>
          </div>
          <p className="auth-tagline mt-1">Inventory Control &amp; Pharmaceutical Logistics</p>
        </div>
        {children}
        {footer && <div className="auth-foot auth-links">{footer}</div>}
      </div>
    </div>
  )
}