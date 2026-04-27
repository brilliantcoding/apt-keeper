'use client'

import { useState } from 'react'
import { updateMaintenanceStatus } from '@/app/admin/actions'

const STATUSES = ['open', 'in_progress', 'completed', 'closed'] as const
type Status = typeof STATUSES[number]

const colors: Record<Status, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-600',
}

export function MaintenanceStatusUpdate({
  id,
  currentStatus,
}: {
  id: string
  currentStatus: string
}) {
  const [status, setStatus] = useState<Status>(currentStatus as Status)
  const [saving, setSaving] = useState(false)

  async function onChange(next: Status) {
    if (next === status) return
    setSaving(true)
    setStatus(next)
    await updateMaintenanceStatus(id, next)
    setSaving(false)
  }

  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value as Status)}
      disabled={saving}
      className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-green-500 focus:outline-none disabled:opacity-50 ${colors[status]}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="bg-white text-slate-900">
          {s.replace('_', ' ')}
        </option>
      ))}
    </select>
  )
}
