'use client'

import { useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { revalidateBills, recalculatePendingInvoices } from '@/app/admin/actions'

interface BillType { id: string; name: string; category: string }

interface Bill {
  id: string
  amount: number
  billing_period_start: string
  billing_period_end: string
  due_date: string
  bill_type_id: string
  split_rule_id: string | null
  bill_types: { name: string } | null
  split_rules: { method: string } | null
}

const SPLIT_METHODS = [
  { value: 'equal',     label: 'Equal — split evenly across all units' },
  { value: 'sq_ft',     label: 'By sq ft — proportional to unit size' },
  { value: 'occupancy', label: 'By occupancy — proportional to occupants' },
  { value: 'fixed',     label: 'Fixed — same amount per unit' },
]

export function EditBillModal({ bill, billTypes }: { bill: Bill; billTypes: BillType[] }) {
  const [open, setOpen]               = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [recalcMsg, setRecalcMsg]     = useState<string | null>(null)
  const [amount, setAmount]           = useState(String(bill.amount / 100))
  const [periodStart, setPeriodStart] = useState(bill.billing_period_start?.slice(0, 10) ?? '')
  const [periodEnd, setPeriodEnd]     = useState(bill.billing_period_end?.slice(0, 10) ?? '')
  const [dueDate, setDueDate]         = useState(bill.due_date?.slice(0, 10) ?? '')
  const [billTypeId, setBillTypeId]   = useState(bill.bill_type_id)
  const [splitMethod, setSplitMethod] = useState(bill.split_rules?.method ?? 'equal')

  function close() {
    setOpen(false)
    setError(null)
    setRecalcMsg(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/v1/bills/${bill.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(parseFloat(amount) * 100),
        billing_period_start: periodStart,
        billing_period_end: periodEnd,
        due_date: dueDate,
        bill_type_id: billTypeId,
        split_method: splitMethod,
      }),
    })

    if (!res.ok) {
      const { error: msg } = await res.json()
      setError(msg ?? 'Failed to update bill')
      setLoading(false)
      return
    }

    await revalidateBills()

    // Recalculate pending invoices so residents see updated amounts immediately
    const { count, error: recalcErr } = await recalculatePendingInvoices(bill.id)
    if (recalcErr) {
      setRecalcMsg(`Bill saved. Could not recalculate invoices: ${recalcErr}`)
    } else if (count > 0) {
      setRecalcMsg(`Bill saved. ${count} pending invoice${count > 1 ? 's' : ''} recalculated with new split amounts.`)
    } else {
      setRecalcMsg('Bill saved. No pending invoices to recalculate.')
    }

    setLoading(false)
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
        title="Edit bill"
      >
        <Pencil className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Edit Bill</h2>
              <button onClick={close} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bill Type</label>
                <select value={billTypeId} onChange={e => setBillTypeId(e.target.value)} className={inputCls}>
                  {billTypes.map(bt => <option key={bt.id} value={bt.id}>{bt.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Total Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className={inputCls + ' pl-7'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Period Start</label>
                  <input required type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Period End</label>
                  <input required type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                <input required type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Split Method</label>
                <select value={splitMethod} onChange={e => setSplitMethod(e.target.value)} className={inputCls}>
                  {SPLIT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
              )}
              {recalcMsg && (
                <p className="text-sm text-green-700 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">{recalcMsg}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={close}
                  className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !!recalcMsg}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors text-sm"
                >
                  {loading ? 'Saving…' : recalcMsg ? 'Saved ✓' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
