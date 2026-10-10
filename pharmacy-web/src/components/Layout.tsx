import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { Icon } from './Icon'
import { Button } from './ui'

interface NavItem {
  to: string
  label: string
  icon: string
  adminOnly?: boolean
  pharmacyOnly?: boolean
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/inventory', label: 'Inventory', icon: 'inventory_2', pharmacyOnly: true },
  { to: '/movements', label: 'Movements', icon: 'swap_vert', pharmacyOnly: true },
  { to: '/loss-reports', label: 'Loss Reports', icon: 'report' },
  { to: '/admin/pharmacies', label: 'Pharmacies', icon: 'storefront', adminOnly: true },
  { to: '/admin/users', label: 'Users', icon: 'group', adminOnly: true },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory',
  '/movements': 'Stock Movements',
  '/loss-reports': 'Loss Reports',
  '/settings': 'Settings',
  '/admin/pharmacies': 'Pharmacies',
  '/admin/users': 'Users',
  '/admin': 'Admin Console',
}

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  const match = Object.keys(TITLES)
    .filter((key) => key !== '/dashboard' && pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0]
  return match ? TITLES[match] : 'PharmaTrack'
}

export function AppShell() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const isAdmin = user?.role === 'ADMIN'
  const items = NAV.filter((item) => {
    if (item.adminOnly && !isAdmin) return false
    if (item.pharmacyOnly && isAdmin) return false
    return true
  })

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-sidebar-width flex-col bg-primary-container text-on-primary-container transition-transform duration-200 lg:static lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary">
            <Icon name="local_pharmacy" size={24} />
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-bold text-white">PharmaTrack</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-on-primary-container/70">
              {isAdmin ? 'Admin Console' : user?.pharmacy?.name ?? 'Pharmacy'}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-md transition-colors ${
                  isActive
                    ? 'bg-primary text-on-primary font-semibold'
                    : 'text-on-primary-container/85 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon name={item.icon} size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-container text-[12px] font-bold text-on-secondary-container">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-semibold text-white">{user?.name}</p>
              <p className="truncate text-[11px] text-on-primary-container/70">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-primary-container/80 hover:bg-white/10 hover:text-white"
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-lowest/95 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Icon name="menu" size={22} />
            </button>
            <h1 className="text-headline-sm">{titleFor(location.pathname)}</h1>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggle}
              title="Toggle theme"
              aria-label="Toggle theme"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low"
            >
              <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} />
            </button>
            {!isAdmin && (
              <Button
                size="sm"
                icon="add"
                className="ml-1 hidden sm:inline-flex"
                onClick={() => navigate('/inventory/new')}
              >
                New product
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-margin-page py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}