import { createClient, createAdminClient } from "@/lib/supabase/server"
import { formatCurrency, formatDate } from '@/lib/utils'
import { Receipt } from 'lucide-react'
import { CreateBillModal } from '@/components/admin/CreateBillModal'
import { EditBillModal } from '@/components/admin/EditBillModal'
import { GenerateInvoicesButton } from '@/components/admin/GenerateInvoicesButton'

export default async function AdminBillsPage() {
  const authClient = await createClient()
  const supabase = createAdminClient()
  const { data: { user } } = await authClient.auth.getUser()

  const [{ data: bills }, { data: properties }, { data: billTypes }] = await Promise.all([
    supabase
      .from('bills')
      .select(`
        *,
        bill_types(name, category),
        properties(name),
        split_rules(method),
        invoices(id, amount_due, amount_paid, status)
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('properties')
      .select('id, name')
      .eq('manager_id', user!.id),
    supabase
      .from('bill_types')
      .select('id, name, category')
      .order('name'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6" />
            Bills
          </h1>
          <p className="text-slate-500 mt-1">All bills across properties</p>
        </div>
        <div className="flex items-center gap-3">
          <GenerateInvoicesButton />
          <CreateBillModal
            properties={properties ?? []}
            billTypes={billTypes ?? []}
            managerId={user!.id}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 text-left">
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Bill Type</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Property</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Period</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Amount</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Due</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Invoices</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Collected</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {(bills ?? []).map((bill) => {
              const invoices = (bill.invoices ?? []) as any[]
              const totalDue = invoices.reduce((s: number, i: any) => s + i.amount_due, 0)
              const totalPaid = invoices.reduce((s: number, i: any) => s + i.amount_paid, 0)
              const paidCount = invoices.filter((i: any) => i.status === 'paid').length
              return (
                <tr key={bill.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {(bill.bill_types as any)?.name}
                    </p>
                    <p className="text-xs text-slate-400 capitalize">{(bill.bill_types as any)?.category}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                    {(bill.properties as any)?.name ?? '—'}
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                    {formatDate(bill.billing_period_start)} – {formatDate(bill.billing_period_end)}
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(bill.amount)}
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                    {formatDate(bill.due_date)}
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                    {paidCount}/{invoices.length} paid
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full w-20">
                        <div
                          className="h-1.5 bg-green-500 rounded-full"
                          style={{ width: totalDue > 0 ? `${Math.min(100, (totalPaid / totalDue) * 100)}%` : '0%' }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{formatCurrency(totalPaid)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <EditBillModal bill={bill as any} billTypes={billTypes ?? []} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!bills?.length && (
          <div className="py-16 text-center text-slate-400">No bills found.</div>
        )}
      </div>
    </div>
  )
}
