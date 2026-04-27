'use client'

import { useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { updateUnit } from '@/app/admin/actions'

interface Unit {
  id: string
  unit_number: string
  floor: number | null
  sq_ft: number | null
  bedrooms: number
  bathrooms: number
}

export function EditUnitModal({ unit }: { unit: Unit }) {
  const [open, setOpen]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [saved, setSaved]         = useState<string | null>(null)
  const [unitNumber, setUnitNumber] = useState(unit.unit_number)
  const [floor, setFloor]         = useState(unit.floor != null ? String(unit.floor) : '')
  const [sqFt, setSqFt]           = useState(unit.sq_ft != null ? String(unit.sq_ft) : '')
  const [bedrooms, setBedrooms]   = useState(String(unit.bedrooms))
  const [bathrooms, setBathrooms] = useState(String(unit.bathrooms))

  function close() { setOpen(false); setError(null); setSaved(null) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await updateUnit(unit.id, {
      unit_number: unitNumber,
      floor: floor ? parseInt(floor) : null,
      sq_ft: sqFt ? parseFloat(sqFt) : null,
      bedrooms: parseInt(bedrooms),
      bathrooms: parseFloat(bathrooms),
    })
    if (result.error) { setError(result.error); setLoading(false); return }
    setSaved('Unit saved. Pending invoices recalculated with updated unit data.')
    setLoading(false)
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
        title="Edit unit"
      >
        <Pencil className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Edit Unit {unit.unit_number}
              </h2>
              <button onClick={close} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unit Number</label>
                <input
                  required
                  value={unitNumber}
                  onChange={e => setUnitNumber(e.target.value)}
                  placeholder="e.g. 101, A2, PH1"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bedrooms</label>
                  <select value={bedrooms} onChange={e => setBedrooms(e.target.value)} className={inputCls}>
                    {['1','2','3','4','5'].map(n => <option key={n} value={n}>{n} bed</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bathrooms</label>
                  <select value={bathrooms} onChange={e => setBathrooms(e.target.value)} className={inputCls}>
                    {['1','1.5','2','2.5','3'].map(n => <option key={n} value={n}>{n} bath</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Floor (optional)</label>
                  <input
                    type="number"
                    value={floor}
                    onChange={e => setFloor(e.target.value)}
                    placeholder="1"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sq ft (optional)</label>
                  <input
                    type="number"
                    value={sqFt}
                    onChange={e => setSqFt(e.target.value)}
                    placeholder="750"
                    className={inputCls}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
              )}
              {saved && (
                <p className="text-sm text-green-700 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">{saved}</p>
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
                  disabled={loading || !!saved}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors text-sm"
                >
                  {loading ? 'Saving…' : saved ? 'Saved ✓' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
