'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Receipt,
  Wrench,
  Bell,
  Building2,
  Users,
  Settings,
  LogOut,
  BarChart3,
  Megaphone,
  CreditCard,
  KeyRound,
  Menu,
  X,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const residentNav = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/bills', label: 'Bills', icon: Receipt },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard },
  { href: '/dashboard/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
]

const adminNav = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/bills', label: 'Bills', icon: Receipt },
  { href: '/admin/invoices', label: 'Invoices', icon: Receipt },
  { href: '/admin/units', label: 'Units', icon: Building2 },
  { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/admin/residents', label: 'Residents', icon: Users },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/notices', label: 'Notices', icon: Megaphone },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/activation-codes', label: 'Access Codes', icon: KeyRound },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

const SEG_LABELS: Record<string, string> = {
  dashboard: 'Overview',
  admin: 'Dashboard',
  bills: 'Bills',
  invoices: 'Invoices',
  payments: 'Payments',
  maintenance: 'Maintenance',
  notifications: 'Notifications',
  notices: 'Notices',
  residents: 'Residents',
  units: 'Units',
  reports: 'Reports',
  settings: 'Settings',
  'activation-codes': 'Access Codes',
  activate: 'Activate',
}

function useBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  return segments.map((seg, i) => ({
    label:
      SEG_LABELS[seg] ??
      seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }))
}

interface AppShellProps {
  role: 'resident' | 'manager' | 'staff' | 'super_admin'
  userName: string
  /** Optional banner rendered between the top bar and main content (e.g. notice ticker) */
  banner?: React.ReactNode
  children: React.ReactNode
}

export function AppShell({ role, userName, banner, children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const nav = role === 'resident' ? residentNav : adminNav
  const crumbs = useBreadcrumbs(pathname)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          // Base
          'flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800',
          'transition-all duration-200 ease-in-out z-50',
          // Mobile: fixed overlay, always w-64, hidden by default
          'fixed inset-y-0 left-0 w-64',
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
          // Desktop: in-flow, width depends on collapsed state
          'md:relative md:translate-x-0 md:shadow-none md:min-h-screen',
          collapsed ? 'md:w-16' : 'md:w-64',
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center border-b border-slate-200 dark:border-slate-800 shrink-0 h-14',
            collapsed ? 'md:justify-center md:px-0 px-4' : 'justify-between px-4',
          )}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0 text-sm">
              A
            </div>
            <span className={cn('font-bold text-slate-900 dark:text-white truncate', collapsed && 'md:hidden')}>
              AptKeeper
            </span>
          </div>
          {/* Close on mobile only */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {nav.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  collapsed && 'md:justify-center md:px-0 md:py-2.5 md:gap-0',
                  isActive
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className={cn('truncate', collapsed && 'md:hidden')}>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div className={cn('border-t border-slate-200 dark:border-slate-800 shrink-0 p-2', collapsed && 'md:flex md:flex-col md:items-center')}>
          {/* Expanded mode */}
          <div className={cn('flex items-center gap-2.5 mb-1 px-2 py-1', collapsed && 'md:hidden')}>
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold shrink-0">
              {userName[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-slate-900 dark:text-white">{userName}</p>
              <p className="text-xs text-slate-500 capitalize">{role}</p>
            </div>
          </div>
          {/* Collapsed mode: avatar icon */}
          <div
            className={cn('hidden mb-1', collapsed && 'md:flex md:justify-center')}
            title={userName}
          >
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold">
              {userName[0]?.toUpperCase()}
            </div>
          </div>
          <button
            onClick={signOut}
            title={collapsed ? 'Sign out' : undefined}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors',
              collapsed && 'md:justify-center md:px-0',
            )}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className={cn(collapsed && 'md:hidden')}>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile backdrop ──────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main column ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden min-w-0">
        {/* Top bar: toggle + breadcrumb */}
        <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2 px-4 h-14">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop sidebar toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 shrink-0"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 text-sm min-w-0 overflow-hidden">
              {crumbs.map((crumb, i) => (
                <span key={crumb.href} className="flex items-center gap-1 min-w-0 shrink-0">
                  {i > 0 && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  {crumb.isLast ? (
                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 truncate hidden sm:block"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
          </div>

          {/* Optional notice banner */}
          {banner}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 bg-slate-50 dark:bg-slate-950 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
