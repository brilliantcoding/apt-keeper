import { createClient, createAdminClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Receipt, Wrench, AlertCircle, CheckCircle } from 'lucide-react'
import { PayButton } from '@/components/bills/PayButton'
import { MaintenanceRequestCard } from '@/components/maintenance/MaintenanceRequestCard'
import Link from 'next/link'

export default async function ResidentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Use adminClient for all data — avoids RLS join failures on bill_types etc.
  const admin = createAdminClient()

  const { data: leases } = await (admin as any)
    .from('leases')
    .select('id')
    .eq('resident_id', user!.id)
    .eq('status', 'active')

  const leaseIds = (leases ?? []).map((l: any) => l.id)
  const safeLeaseIds = leaseIds.length ? leaseIds : ['00000000-0000-0000-0000-000000000000']

  const [{ data: invoices }, { data: requests }] = await Promise.all([
    (admin as any)
      .from('invoices')
      .select('id, amount_due, amount_paid, status, due_date, bills(bill_types(name))')
      .in('lease_id', safeLeaseIds)
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(5),
    (admin as any)
      .from('maintenance_requests')
      .select('id, title, description, status, priority, created_at, sla_deadline')
      .eq('resident_id', user!.id)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const requestIds = ((requests ?? []) as any[]).map((r: any) => r.id)
  const { data: comments } = requestIds.length
    ? await (admin as any)
        .from('maintenance_comments')
        .select('id, request_id, body, created_at, author_id, users(full_name, email, role)')
        .in('request_id', requestIds)
        .order('created_at', { ascending: true })
    : { data: [] }

  const commentsByRequest = ((comments ?? []) as any[]).reduce((acc: any, c: any) => {
    if (!acc[c.request_id]) acc[c.request_id] = []
    acc[c.request_id].push(c)
    return acc
  }, {})

  const now = new Date()
  const totalDue = (invoices ?? []).reduce((sum: number, inv: any) => sum + (inv.amount_due - inv.amount_paid), 0)
  const overdueCount = (invoices ?? []).filter((inv: any) => {
    const remaining = inv.amount_due - inv.amount_paid
    return remaining > 0 && new Date(inv.due_date) < now
  }).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your bills and maintenance requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Due" value={formatCurrency(totalDue)} icon={<Receipt className="w-5 h-5 text-green-600" />} accent="green" href="/dashboard/bills" />
        <StatCard label="Overdue Bills" value={String(overdueCount)} icon={<AlertCircle className="w-5 h-5 text-red-500" />} accent={overdueCount > 0 ? 'red' : 'slate'} href="/dashboard/bills" />
        <StatCard label="Open Requests" value={String(requests?.length ?? 0)} icon={<Wrench className="w-5 h-5 text-amber-500" />} accent="amber" href="/dashboard/maintenance" />
      </div>

      {/* Pending invoices */}
      <section>
        <h2 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">Pending Bills</h2>
        {!invoices?.length ? (
          <EmptyState icon={<CheckCircle className="w-8 h-8 text-green-500" />} label="All paid up!" />
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border divide-y divide-slate-100 dark:divide-slate-800">
            {(invoices as any[]).map((inv: any) => {
              const remaining = inv.amount_due - inv.amount_paid
              const isOverdue = remaining > 0 && new Date(inv.due_date) < now
              const displayStatus = isOverdue ? 'overdue' : inv.status
              return (
                <div key={inv.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {inv.bills?.bill_types?.name ?? 'Bill'}
                    </p>
                    <p className="text-sm text-slate-500">Due {formatDate(inv.due_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${displayStatus === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {displayStatus}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(remaining)}</span>
                    <PayButton invoiceId={inv.id} amount={remaining} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Active maintenance */}
      <section>
        <h2 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">Active Maintenance Requests</h2>
        {!requests?.length ? (
          <EmptyState icon={<CheckCircle className="w-8 h-8 text-green-500" />} label="No open requests" />
        ) : (
          <div className="space-y-3">
            {(requests as any[]).map((req: any) => (
              <MaintenanceRequestCard
                key={req.id}
                request={req}
                comments={commentsByRequest[req.id] ?? []}
                userId={user!.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value, icon, accent, href }: { label: string; value: string; icon: React.ReactNode; accent: string; href: string }) {
  return (
    <Link href={href} className="bg-white dark:bg-slate-900 rounded-xl border p-5 flex items-center gap-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all">
      <div className={`w-11 h-11 rounded-xl bg-${accent}-50 dark:bg-${accent}-900/20 flex items-center justify-center shrink-0`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </Link>
  )
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border p-10 flex flex-col items-center gap-2 text-slate-400">
      {icon}<p>{label}</p>
    </div>
  )
}

