import { createAdminClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Receipt } from 'lucide-react'

export default async function AdminInvoicesPage() {
  const supabase = createAdminClient()

  const { data: invoices } = await (supabase as any)
    .from('invoices')
    .select(`
      id, amount_due, amount_paid, status, due_date, created_at,
      lease_id,
      bills(bill_types(name, category)),
      units(unit_number, properties(name))
    `)
    .order('created_at', { ascending: false })

  // Get resident info via leases separately
  const leaseIds = (invoices ?? []).map((i: any) => i.lease_id).filter(Boolean)
  const { data: leases } = leaseIds.length
    ? await (supabase as any)
        .from('leases')
        .select('id, resident_id, users(full_name, email)')
        .in('id', leaseIds)
    : { data: [] }

  const leaseMap = Object.fromEntries(
    ((leases ?? []) as any[]).map((l: any) => [l.id, l])
  )

  const totalDue = (invoices ?? []).reduce((s: number, i: any) => s + i.amount_due, 0)
  const totalPaid = (invoices ?? []).reduce((s: number, i: any) => s + i.amount_paid, 0)
  const overdueCount = (invoices ?? []).filter((i: any) => i.status === 'overdue').length
  const pendingCount = (invoices ?? []).filter((i: any) => i.status === 'pending').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Receipt className="w-6 h-6" />
          Invoices
        </h1>
        <p className="text-slate-500 mt-1">{invoices?.length ?? 0} invoices</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Billed" value={formatCurrency(totalDue)} color="slate" />
        <StatCard label="Collected" value={formatCurrency(totalPaid)} color="green" />
        <StatCard label="Pending" value={String(pendingCount)} color="amber" />
        <StatCard label="Overdue" value={String(overdueCount)} color="red" />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 text-left">
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Resident</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Unit</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Bill Type</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Amount</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Paid</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Due</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {((invoices ?? []) as any[]).map((inv: any) => {
              const lease = leaseMap[inv.lease_id]
              const resident = lease?.users
              const unit = inv.units
              const billType = inv.bills?.bill_types
              const remaining = inv.amount_due - inv.amount_paid

              return (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {resident?.full_name || resident?.email || '—'}
                    </p>
                    <p className="text-xs text-slate-400">{resident?.email}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                    <p>Unit {unit?.unit_number ?? '—'}</p>
                    <p className="text-xs text-slate-400">{unit?.properties?.name}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                    <p>{billType?.name ?? '—'}</p>
                    <p className="text-xs text-slate-400 capitalize">{billType?.category}</p>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(inv.amount_due)}
                  </td>
                  <td className="px-5 py-4">
                    {inv.amount_paid > 0 ? (
                      <span className="text-green-600 font-semibold">{formatCurrency(inv.amount_paid)}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                    {remaining > 0 && inv.amount_paid > 0 && (
                      <p className="text-xs text-slate-400">{formatCurrency(remaining)} left</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{formatDate(inv.due_date)}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <a
                      href={`/api/invoices/${inv.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline underline-offset-2"
                    >
                      PDF
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!invoices?.length && (
          <div className="py-16 text-center text-slate-400">
            No invoices yet. Generate invoices from the Bills page.
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const border: Record<string, string> = {
    green: 'border-l-green-500',
    amber: 'border-l-amber-500',
    red: 'border-l-red-500',
    slate: 'border-l-slate-400',
  }
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-l-4 ${border[color]} p-4`}>
      <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    overdue: 'bg-red-100 text-red-700',
    paid: 'bg-green-100 text-green-700',
    partial: 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}
