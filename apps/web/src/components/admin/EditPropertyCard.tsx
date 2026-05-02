'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, X, Check, CreditCard } from 'lucide-react'
import { updateProperty, deleteProperty, togglePropertyPayments } from '@/app/admin/actions'
import { formatDate } from '@/lib/utils'

export function EditPropertyCard({
  property,
}: {
  property: { id: string; name: string; address: string; created_at: string; payments_enabled?: boolean }
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(property.name)
  const [address, setAddress] = useState(property.address)
  const [paymentsEnabled, setPaymentsEnabled] = useState(property.payments_enabled ?? true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isTogglingPayments, startToggleTransition] = useTransition()
  const router = useRouter()

  function cancel() {
    setName(property.name)
    setAddress(property.address)
    setError(null)
    setEditing(false)
  }

  function save() {
    if (!name.trim() || !address.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await updateProperty(property.id, name, address)
      if (result.error) setError(result.error)
      else { setEditing(false); router.refresh() }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProperty(property.id)
      if (!result.error) router.refresh()
    })
  }

  function handleTogglePayments() {
    const next = !paymentsEnabled
    setPaymentsEnabled(next)
    startToggleTransition(async () => {
      const result = await togglePropertyPayments(property.id, next)
      if (result.error) {
        setPaymentsEnabled(!next) // revert on error
      }
    })
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border p-5">
      {editing ? (
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Property name" className={inputClass} />
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className={inputClass} />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={cancel} className="flex items-center gap-1 text-xs px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button onClick={save} disabled={isPending} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold">
              <Check className="w-3.5 h-3.5" /> {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{name}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{address}</p>
              <p className="text-xs text-slate-400 mt-2">Created {formatDate(property.created_at)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-red-600">Sure?</span>
                  <button onClick={handleDelete} disabled={isPending} className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50">
                    {isPending ? '…' : 'Yes'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400">
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Payments toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <CreditCard className="w-4 h-4" />
              <span>Online payments</span>
            </div>
            <button
              onClick={handleTogglePayments}
              disabled={isTogglingPayments}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                paymentsEnabled ? 'bg-green-600' : 'bg-slate-200 dark:bg-slate-700'
              }`}
              role="switch"
              aria-checked={paymentsEnabled}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  paymentsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
