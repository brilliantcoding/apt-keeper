import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Receipt, Wrench, AlertCircle, CheckCircle } from 'lucide-react'

export default async function ResidentDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: invoices }, { data: requests }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, bills(bill_types(name))')
      .eq('leases.resident_id', user!.id)
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(5),
    supabase
      .from('maintenance_requests')
      .select('*')
      .eq('resident_id', user!.id)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const totalDue = (invoices ?? []).reduce((sum, inv) => sum + (inv.amount_due - inv.amount_paid), 0)
  const overdueCount = (invoices ?? []).filter((inv) => inv.status === 'overdue').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your bills and maintenance requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Due"
          value={formatCurrency(totalDue)}
          icon={<Receipt className="w-5 h-5 text-green-600" />}
          accent="green"
        />
        <StatCard
          label="Overdue Bills"
          value={String(overdueCount)}
          icon={<AlertCircle className="w-5 h-5 text-red-500" />}
          accent={overdueCount > 0 ? 'red' : 'slate'}
        />
        <StatCard
          label="Open Requests"
          value={String(requests?.length ?? 0)}
          icon={<Wrench className="w-5 h-5 text-amber-500" />}
          accent="amber"
        />
      </div>

      {/* Recent invoices */}
      <section>
        <h2 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">Pending Bills</h2>
        {!invoices?.length ? (
          <EmptyState icon={<CheckCircle className="w-8 h-8 text-green-500" />} label="All paid up!" />
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border divide-y divide-slate-100 dark:divide-slate-800">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {(inv.bills as any)?.bill_types?.name ?? 'Bill'}
                  </p>
                  <p className="text-sm text-slate-500">Due {formatDate(inv.due_date)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      inv.status === 'overdue'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {inv.status}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(inv.amount_due - inv.amount_paid)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent maintenance */}
      <section>
        <h2 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">
          Active Maintenance Requests
        </h2>
        {!requests?.length ? (
          <EmptyState
            icon={<CheckCircle className="w-8 h-8 text-green-500" />}
            label="No open requests"
          />
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border divide-y divide-slate-100 dark:divide-slate-800">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{req.title}</p>
                  <p className="text-sm text-slate-500">Opened {formatDate(req.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <PriorityBadge priority={req.priority} />
                  <StatusBadge status={req.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl bg-${accent}-50 dark:bg-${accent}-900/20 flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  )
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border p-10 flex flex-col items-center gap-2 text-slate-400">
      {icon}
      <p>{label}</p>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    P1: 'bg-red-100 text-red-700',
    P2: 'bg-orange-100 text-orange-700',
    P3: 'bg-amber-100 text-amber-700',
    P4: 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${colors[priority] ?? 'bg-slate-100 text-slate-600'}`}>
      {priority}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    closed: 'bg-slate-100 text-slate-600',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${colors[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
