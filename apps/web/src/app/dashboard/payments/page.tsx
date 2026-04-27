import { createClient, createAdminClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CreditCard, Building2, Landmark, CheckCircle2, Clock } from 'lucide-react'

function parseMethod(raw: string): {
  icon: React.ReactNode
  label: string
  detail: string
  holder: string
} {
  try {
    const d = JSON.parse(raw)
    if (d.type === 'card') {
      return {
        icon: <CreditCard className="w-4 h-4 text-blue-500" />,
        label: `${d.brand ?? 'Card'} ····${d.last4}`,
        detail: `Exp ${d.expiry}`,
        holder: d.holder ?? '',
      }
    }
    if (d.type === 'ach') {
      return {
        icon: <Building2 className="w-4 h-4 text-purple-500" />,
        label: `ACH ····${d.accountLast4}`,
        detail: `Routing ····${d.routingLast4}`,
        holder: d.holder ?? '',
      }
    }
    if (d.type === 'wire') {
      return {
        icon: <Landmark className="w-4 h-4 text-amber-500" />,
        label: `Wire — ${d.bank}`,
        detail: '',
        holder: d.holder ?? '',
      }
    }
  } catch {}
  return {
    icon: <CreditCard className="w-4 h-4 text-slate-400" />,
    label: raw,
    detail: '',
    holder: '',
  }
}

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()

  const { data: leases } = await (admin as any)
    .from('leases')
    .select('id')
    .eq('resident_id', user!.id)

  const leaseIds = (leases ?? []).map((l: any) => l.id)
  const safeLeaseIds = leaseIds.length ? leaseIds : ['00000000-0000-0000-0000-000000000000']

  const { data: invoices } = await (admin as any)
    .from('invoices')
    .select('id, due_date, bills(bill_types(name))')
    .in('lease_id', safeLeaseIds)

  const invoiceMap = Object.fromEntries(
    ((invoices ?? []) as any[]).map((i: any) => [i.id, i])
  )

  const invoiceIds = (invoices ?? []).map((i: any) => i.id)
  const safeInvoiceIds = invoiceIds.length ? invoiceIds : ['00000000-0000-0000-0000-000000000000']

  const { data: payments } = await (admin as any)
    .from('payments')
    .select('id, amount, payment_method, status, paid_at, created_at, invoice_id')
    .in('invoice_id', safeInvoiceIds)
    .order('created_at', { ascending: false })

  const totalPaid = ((payments ?? []) as any[])
    .filter((p: any) => p.status === 'succeeded')
    .reduce((sum: number, p: any) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payment History</h1>
        <p className="text-slate-500 mt-1">All payments made for your unit</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border p-5">
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
          <p className="text-sm text-slate-500 mt-0.5">Total Paid</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border p-5">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{payments?.length ?? 0}</p>
          <p className="text-sm text-slate-500 mt-0.5">Transactions</p>
        </div>
      </div>

      {/* Payments table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
        {!payments?.length ? (
          <div className="py-16 text-center text-slate-400">
            <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p>No payments yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-left">
                <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Bill</th>
                <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Paid By</th>
                <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Payment Method</th>
                <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Date</th>
                <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Amount</th>
                <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {((payments ?? []) as any[]).map((p: any) => {
                const invoice = invoiceMap[p.invoice_id]
                const billName = invoice?.bills?.bill_types?.name ?? 'Bill'
                const m = parseMethod(p.payment_method)
                return (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900 dark:text-white">{billName}</p>
                      <p className="text-xs text-slate-400 font-mono">#{p.invoice_id.slice(0, 8)}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-300 text-sm">
                      {m.holder || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {m.icon}
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{m.label}</p>
                          {m.detail && <p className="text-xs text-slate-400">{m.detail}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                      {formatDate(p.paid_at ?? p.created_at)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-5 py-4">
                      <PaymentStatusBadge status={p.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    succeeded: { cls: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3 h-3" /> },
    pending:   { cls: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" /> },
    failed:    { cls: 'bg-red-100 text-red-700',     icon: null },
  }
  const config = map[status] ?? { cls: 'bg-slate-100 text-slate-600', icon: null }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${config.cls}`}>
      {config.icon}{status}
    </span>
  )
}
