import { createAdminClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Receipt, Users, Wrench, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = createAdminClient()

  const [
    { count: totalInvoices },
    { data: overdueInvoices },
    { count: openRequests },
    { count: activeLeases },
    { data: recentPayments },
  ] = await Promise.all([
    (supabase as any).from('invoices').select('*', { count: 'exact', head: true }),
    (supabase as any)
      .from('invoices')
      .select('amount_due, amount_paid')
      .eq('status', 'overdue'),
    (supabase as any)
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress']),
    (supabase as any)
      .from('leases')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    (supabase as any)
      .from('payments')
      .select('amount, paid_at, invoices(bills(bill_types(name)))')
      .eq('status', 'succeeded')
      .order('paid_at', { ascending: false })
      .limit(5),
  ])

  const totalOverdue = ((overdueInvoices ?? []) as any[]).reduce(
    (sum: number, inv: any) => sum + (inv.amount_due - inv.amount_paid),
    0
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">Property management overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Invoices"  value={String(totalInvoices ?? 0)}   icon={<Receipt    className="w-5 h-5 text-green-600" />} href="/admin/invoices"     />
        <StatCard label="Overdue Amount"  value={formatCurrency(totalOverdue)} icon={<TrendingUp className="w-5 h-5 text-red-500"   />} href="/admin/invoices"     />
        <StatCard label="Open Requests"   value={String(openRequests ?? 0)}    icon={<Wrench     className="w-5 h-5 text-amber-500" />} href="/admin/maintenance"  />
        <StatCard label="Active Leases"   value={String(activeLeases ?? 0)}    icon={<Users      className="w-5 h-5 text-blue-500"  />} href="/admin/residents"    />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">Recent Payments</h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border divide-y divide-slate-100 dark:divide-slate-800">
          {((recentPayments ?? []) as any[]).map((p: any) => (
            <div key={(p as any).id} className="flex items-center justify-between px-5 py-4">
              <p className="text-slate-700 dark:text-slate-300">
                {(p.invoices as any)?.bills?.bill_types?.name ?? 'Payment'}
              </p>
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-400">{new Date(p.paid_at!).toLocaleDateString()}</span>
                <span className="font-semibold text-green-600">{formatCurrency(p.amount)}</span>
              </div>
            </div>
          ))}
          {!recentPayments?.length && (
            <div className="py-10 text-center text-slate-400">No payments yet.</div>
          )}
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value, icon, href }: { label: string; value: string; icon: React.ReactNode; href: string }) {
  return (
    <Link href={href} className="bg-white dark:bg-slate-900 rounded-xl border p-5 flex items-center gap-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all">
      <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </Link>
  )
}
