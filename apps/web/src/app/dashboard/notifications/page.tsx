import { createClient, createAdminClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Receipt,
  Wrench,
  Clock,
} from 'lucide-react'
import { NotificationToggle } from '@/components/notifications/NotificationToggle'

const EVENT_TYPES = [
  { key: 'invoice_due', label: 'Invoice Due' },
  { key: 'invoice_overdue', label: 'Invoice Overdue' },
  { key: 'payment_received', label: 'Payment Received' },
  { key: 'maintenance_update', label: 'Maintenance Update' },
  { key: 'lease_expiring', label: 'Lease Expiring' },
]

const CHANNELS = [
  { key: 'push', label: 'Push', icon: Smartphone },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'sms', label: 'SMS', icon: MessageSquare },
]

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createAdminClient()

  // Preferences
  const { data: prefs } = await (admin as any)
    .from('notification_preferences')
    .select('channel, event_type, enabled')
    .eq('user_id', user!.id)

  const isEnabled = (channel: string, eventType: string): boolean => {
    const pref = (prefs ?? []).find(
      (p: any) => p.channel === channel && p.event_type === eventType
    )
    return pref ? pref.enabled : true
  }

  // Activity feed: get lease IDs first
  const { data: leases } = await supabase
    .from('leases')
    .select('id')
    .eq('resident_id', user!.id)

  const leaseIds = (leases ?? []).map((l: any) => l.id)
  const safeLeaseIds = leaseIds.length ? leaseIds : ['00000000-0000-0000-0000-000000000000']

  const [{ data: recentInvoices }, { data: recentMaintenance }] = await Promise.all([
    (admin as any)
      .from('invoices')
      .select('id, amount_due, status, created_at, bills(bill_types(name))')
      .in('lease_id', safeLeaseIds)
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('maintenance_requests')
      .select('id, title, status, created_at, priority')
      .eq('resident_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // Get sent reminders if there are invoices
  let sentReminders: any[] = []
  if (recentInvoices?.length) {
    const invoiceIds = (recentInvoices as any[]).map((i) => i.id)
    const { data } = await (admin as any)
      .from('reminders')
      .select('id, stage, sent_at, channel')
      .in('invoice_id', invoiceIds)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(10)
    sentReminders = data ?? []
  }

  type ActivityItem = {
    id: string
    icon: React.ReactNode
    title: string
    subtitle: string
    date: string
    badgeColor: string
    badgeText: string
  }

  const activities: ActivityItem[] = [
    ...(recentInvoices ?? []).map((inv: any) => ({
      id: `inv-${inv.id}`,
      icon: <Receipt className="w-4 h-4 text-green-600" />,
      title: `Invoice: ${inv.bills?.bill_types?.name ?? 'Bill'}`,
      subtitle: formatCurrency(inv.amount_due),
      date: inv.created_at,
      badgeColor:
        inv.status === 'overdue'
          ? 'bg-red-100 text-red-700'
          : inv.status === 'paid'
          ? 'bg-green-100 text-green-700'
          : 'bg-amber-100 text-amber-700',
      badgeText: inv.status,
    })),
    ...(recentMaintenance ?? []).map((req: any) => ({
      id: `maint-${req.id}`,
      icon: <Wrench className="w-4 h-4 text-amber-600" />,
      title: req.title,
      subtitle: `${req.priority} · ${req.status.replace('_', ' ')}`,
      date: req.created_at,
      badgeColor:
        req.status === 'open'
          ? 'bg-blue-100 text-blue-700'
          : req.status === 'in_progress'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-green-100 text-green-700',
      badgeText: req.status.replace('_', ' '),
    })),
    ...sentReminders.map((rem: any) => ({
      id: `rem-${rem.id}`,
      icon: <Clock className="w-4 h-4 text-slate-500" />,
      title: `Reminder sent (Stage ${rem.stage})`,
      subtitle: `via ${rem.channel}`,
      date: rem.sent_at,
      badgeColor: 'bg-slate-100 text-slate-600',
      badgeText: rem.channel,
    })),
  ]
    .filter((a) => !!a.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20)

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-6 h-6" />
          Notifications
        </h1>
        <p className="text-slate-500 mt-1">Activity feed and notification preferences</p>
      </div>

      {/* Activity Feed */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Recent Activity
        </h2>
        {activities.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border p-10 text-center text-slate-400">
            No activity yet.
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border divide-y divide-slate-100 dark:divide-slate-800">
            {activities.map((item) => (
              <div key={item.id} className="flex items-start gap-4 px-5 py-4">
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.subtitle}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${item.badgeColor}`}
                  >
                    {item.badgeText}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(item.date)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Notification Preferences */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Preferences
        </h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="grid grid-cols-4 text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <div>Event</div>
            {CHANNELS.map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
            ))}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {EVENT_TYPES.map(({ key, label }) => (
              <div key={key} className="grid grid-cols-4 items-center px-5 py-4">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {label}
                </span>
                {CHANNELS.map(({ key: channel }) => (
                  <div key={channel} className="flex items-center">
                    <NotificationToggle
                      channel={channel}
                      eventType={key}
                      initialEnabled={isEnabled(channel, key)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          SMS requires Twilio setup. Push requires app installation.
        </p>
      </section>
    </div>
  )
}
