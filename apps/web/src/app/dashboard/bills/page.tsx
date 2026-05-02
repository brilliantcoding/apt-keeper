import { createClient, createAdminClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getCurrency } from '@/lib/currency'
import { PayButton } from '@/components/bills/PayButton'
import Link from 'next/link'

export default async function ResidentBillsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const currency = await getCurrency()

  const { data: leases } = await (admin as any)
    .from('leases')
    .select('id')
    .eq('resident_id', user!.id)

  const leaseIds = (leases ?? []).map((l: any) => l.id)
  const safeLeaseIds = leaseIds.length ? leaseIds : ['00000000-0000-0000-0000-000000000000']

  const { data: invoices } = await (admin as any)
    .from('invoices')
    .select('id, amount_due, amount_paid, status, due_date, bills(amount, billing_period_start, billing_period_end, bill_types(name, category))')
    .in('lease_id', safeLeaseIds)
    .order('due_date', { ascending: false })

  // Check if payments are enabled for the resident's property
  const { data: leaseWithUnit } = leaseIds.length
    ? await (admin as any)
        .from('leases')
        .select('units(properties(payments_enabled))')
        .in('id', leaseIds)
        .limit(1)
        .single()
    : { data: null }
  const paymentsEnabled = leaseWithUnit?.units?.properties?.payments_enabled ?? true

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Bills</h1>
          <p className="text-slate-500 mt-1">All invoices for your unit</p>
        </div>
        <Link href="/dashboard/payments" className="text-sm font-semibold text-green-600 hover:text-green-700 transition-colors">
          View Payment History →
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 text-left">
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Bill</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Period</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Due</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Amount</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {((invoices ?? []) as any[]).map((inv: any) => {
              const bill = inv.bills as any
              const billType = bill?.bill_types
              const remaining = inv.amount_due - inv.amount_paid
              return (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900 dark:text-white">{billType?.name ?? 'Bill'}</p>
                    <p className="text-xs text-slate-400 capitalize">{billType?.category}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                    {bill?.billing_period_start ? `${formatDate(bill.billing_period_start)} – ${formatDate(bill.billing_period_end)}` : '—'}
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{formatDate(inv.due_date)}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">{formatCurrency(remaining, currency)}</td>
                  <td className="px-5 py-4"><StatusBadge status={inv.status} /></td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/api/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline underline-offset-2"
                      >
                        PDF
                      </a>
                      {inv.status !== 'paid' && remaining > 0 && paymentsEnabled && (
                        <PayButton invoiceId={inv.id} amount={remaining} currency={currency} />
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!invoices?.length && (
          <div className="py-16 text-center text-slate-400">No invoices found.</div>
        )}
      </div>
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
