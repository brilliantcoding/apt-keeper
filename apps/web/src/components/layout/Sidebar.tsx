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

interface SidebarProps {
  role: 'resident' | 'manager' | 'staff' | 'super_admin'
  userName: string
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const nav = role === 'resident' ? residentNav : adminNav
  const [open, setOpen] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sidebarContent = (
    <aside className={cn(
      // Base styles
      'flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800',
      // Mobile: fixed overlay drawer
      'fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out',
      open ? 'translate-x-0' : '-translate-x-full',
      // Desktop: static in flow
      'md:static md:translate-x-0 md:min-h-screen',
    )}>
      <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold">
            A
          </div>
          <span className="font-bold text-slate-900 dark:text-white">AptKeeper</span>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setOpen(false)}
          className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-3 px-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold shrink-0">
            {userName[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-slate-900 dark:text-white">{userName}</p>
            <p className="text-xs text-slate-500 capitalize">{role}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed top-3 left-3 z-40 md:hidden p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm',
          open && 'hidden'
        )}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
      </button>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {sidebarContent}
    </>
  )
}
