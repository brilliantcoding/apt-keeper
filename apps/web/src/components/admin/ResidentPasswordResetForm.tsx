'use client'

import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { sendPasswordReset } from '@/app/admin/actions'

type Resident = { id: string; full_name: string | null; email: string }

export function ResidentPasswordResetForm({ residents }: { residents: Resident[] }) {
  const [selectedId, setSelectedId] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  const selected = residents.find((r) => r.id === selectedId)

  async function handleReset() {
    if (!selectedId) return
    setState('loading')
    const { error } = await sendPasswordReset(selectedId)
    if (error) {
      setErrMsg(error)
      setState('error')
    } else {
      setState('done')
    }
  }

  function reset() {
    setSelectedId('')
    setState('idle')
    setErrMsg('')
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border divide-y divide-slate-100 dark:divide-slate-800">
      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <label className="block text-sm text-slate-500 mb-1">Select resident</label>
          <select
            value={selectedId}
            onChange={(e) => { setSelectedId(e.target.value); setState('idle') }}
            className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Choose a resident —</option>
            {residents.map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_name || r.email} {r.full_name ? `(${r.email})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          {state === 'done' ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-green-600 font-semibold">Reset email sent to {selected?.email}</span>
              <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600">Dismiss</button>
            </div>
          ) : state === 'error' ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-500">{errMsg}</span>
              <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600">Dismiss</button>
            </div>
          ) : (
            <button
              onClick={handleReset}
              disabled={!selectedId || state === 'loading'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <KeyRound className="w-4 h-4" />
              {state === 'loading' ? 'Sending…' : 'Send Password Reset'}
            </button>
          )}
        </div>
      </div>
      {!residents.length && (
        <div className="px-5 py-4 text-sm text-slate-400">No residents found.</div>
      )}
    </div>
  )
}
