import { createAdminClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { Bell, CheckCircle, Clock, XCircle, SkipForward } from 'lucide-react'

const STAGE_LABELS: Record<number, string> = {
  1: '7 days before due',
  2: '3 days before due',
  3: '1 day before due',
  4: 'On due date',
  5: '3 days overdue',
  6: '7 days overdue',
  7: '14 days overdue',
  8: '30 days overdue',
}

export default async function AdminNotificationsPage() {
  const supabase = createAdminClient()

  const [{ data: reminders }, { data: queued }, { data: prefStats }] = await Promise.all([
    // Recent sent/failed reminders
    (supabase as any)
      .from('reminders')
      .select(`
        id, stage, sent_at, channel, status,
        invoices(
          amount_due,
          leases(
            users(full_name, email),
            units(unit_number, properties(name))
          ),
          bills(bill_types(name))
        )
      `)
      .in('status', ['sent', 'failed'])
      .order('sent_at', { ascending: false })
      .limit(50),

    // Upcoming queued reminders
    (supabase as any)
      .from('reminders')
      .select(`
        id, stage, scheduled_at, channel,
        invoices(
          amount_due,
          leases(
            users(full_name, email),
            units(unit_number, properties(name))
          ),
          bills(bill_types(name))
        )
      `)
      .eq('status', 'queued')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(20),

    // Notification preference counts
    (supabase as any)
      .from('notification_preferences')
      .select('channel, enabled')
  ])

  const sentCount = (reminders ?? []).filter((r: any) => r.status === 'sent').length
  const failedCount = (reminders ?? []).filter((r: any) => r.status === 'failed').length
  const queuedCount = (queued ?? []).length

  const prefByChannel = (prefStats ?? []).reduce((acc: any, p: any) => {
    if (!acc[p.channel]) acc[p.channel] = { enabled: 0, disabled: 0 }
    if (p.enabled) acc[p.channel].enabled++
    else acc[p.channel].disabled++
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-6 h-6" />
          Notifications
        </h1>
        <p className="text-slate-500 mt-1">Reminder delivery activity and preferences overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<CheckCircle className="w-5 h-5 text-green-600" />} label="Sent" value={sentCount} color="green" />
        <StatCard icon={<XCircle className="w-5 h-5 text-red-500" />} label="Failed" value={failedCount} color="red" />
        <StatCard icon={<Clock className="w-5 h-5 text-amber-500" />} label="Queued" value={queuedCount} color="amber" />
      </div>

      {/* Preference summary */}
      {Object.keys(prefByChannel).length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Resident Preferences
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {['push', 'email', 'sms'].map((channel) => {
              const stats = prefByChannel[channel] ?? { enabled: 0, disabled: 0 }
              return (
                <div key={channel} className="bg-white dark:bg-slate-900 rounded-xl border p-4">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize mb-2">
                    {channel}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.enabled}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    opted in · {stats.disabled} opted out
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {(queued ?? []).length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Upcoming Reminders
          </h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Resident</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Bill</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Stage</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Channel</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Scheduled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(queued ?? []).map((r: any) => {
                  const resident = r.invoices?.leases?.users
                  const unit = r.invoices?.leases?.units
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {resident?.full_name || resident?.email || '—'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {unit ? `Unit ${unit.unit_number} · ${unit.properties?.name}` : '—'}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                        {r.invoices?.bills?.bill_types?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                          {STAGE_LABELS[r.stage] ?? `Stage ${r.stage}`}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 capitalize">{r.channel}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{formatDate(r.scheduled_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent activity */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Recent Activity
        </h2>
        {!(reminders ?? []).length ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border p-10 text-center text-slate-400">
            No reminders sent yet.
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Resident</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Bill</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Stage</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Channel</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(reminders ?? []).map((r: any) => {
                  const resident = r.invoices?.leases?.users
                  const unit = r.invoices?.leases?.units
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {resident?.full_name || resident?.email || '—'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {unit ? `Unit ${unit.unit_number} · ${unit.properties?.name}` : '—'}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                        {r.invoices?.bills?.bill_types?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {STAGE_LABELS[r.stage] ?? `Stage ${r.stage}`}
                      </td>
                      <td className="px-5 py-3 text-slate-500 capitalize">{r.channel}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        {r.sent_at ? formatDate(r.sent_at) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}) {
  const bg: Record<string, string> = {
    green: 'bg-green-50 dark:bg-green-900/20',
    red: 'bg-red-50 dark:bg-red-900/20',
    amber: 'bg-amber-50 dark:bg-amber-900/20',
  }
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl ${bg[color]} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    sent: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    skipped: 'bg-slate-100 text-slate-600',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}
