'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X } from 'lucide-react'
import { addBillType, deleteBillType } from '@/app/admin/actions'

const CATEGORIES = ['utility', 'rent', 'fee', 'tax', 'other']

export function BillTypeManager({
  billTypes,
}: {
  billTypes: { id: string; name: string; category: string; is_metered: boolean; unit_of_measure: string | null }[]
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('utility')
  const [isMetered, setIsMetered] = useState(false)
  const [unit, setUnit] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function resetForm() {
    setName('')
    setCategory('utility')
    setIsMetered(false)
    setUnit('')
    setError(null)
    setShowForm(false)
  }

  function handleAdd() {
    if (!name.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addBillType({
        name: name.trim(),
        category,
        is_metered: isMetered,
        unit_of_measure: unit.trim() || null,
      })
      if (result.error) {
        setError(result.error)
      } else {
        resetForm()
        router.refresh()
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteBillType(id)
      if (!result.error) {
        setDeletingId(null)
        router.refresh()
      }
    })
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
      {billTypes.map((bt) => (
        <div key={bt.id} className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
          <div>
            <span className="font-medium text-sm text-slate-900 dark:text-white">{bt.name}</span>
            <span className="ml-2 text-xs text-slate-400 capitalize">{bt.category}</span>
            {bt.is_metered && (
              <span className="ml-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-2 py-0.5 rounded-full">Metered</span>
            )}
            {bt.unit_of_measure && (
              <span className="ml-1.5 text-xs text-slate-400">{bt.unit_of_measure}</span>
            )}
          </div>
          {deletingId === bt.id ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-red-600">Delete?</span>
              <button onClick={() => handleDelete(bt.id)} disabled={isPending} className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50">
                {isPending ? '…' : 'Yes'}
              </button>
              <button onClick={() => setDeletingId(null)} className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400">
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDeletingId(bt.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}

      {/* Add form */}
      {showForm ? (
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gas" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Unit of measure</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. kWh (optional)" className={inputClass} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMetered}
                  onChange={(e) => setIsMetered(e.target.checked)}
                  className="w-4 h-4 rounded accent-green-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Metered</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={resetForm} className="flex items-center gap-1 text-xs px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button onClick={handleAdd} disabled={isPending || !name.trim()} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold">
              <Plus className="w-3.5 h-3.5" /> {isPending ? 'Adding…' : 'Add Bill Type'}
            </button>
          </div>
        </div>
      ) : (
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"
          >
            <Plus className="w-4 h-4" /> Add bill type
          </button>
        </div>
      )}
    </div>
  )
}
