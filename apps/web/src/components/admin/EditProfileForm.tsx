'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Check } from 'lucide-react'
import { updateProfile } from '@/app/admin/actions'

export function EditProfileForm({
  userId,
  initialName,
  initialPhone,
}: {
  userId: string
  initialName: string
  initialPhone: string
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function cancel() {
    setName(initialName)
    setPhone(initialPhone)
    setError(null)
    setEditing(false)
  }

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await updateProfile(userId, name, phone)
      if (result.error) {
        setError(result.error)
      } else {
        setEditing(false)
        router.refresh()
      }
    })
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border divide-y divide-slate-100 dark:divide-slate-800">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-3">
        <span className="text-sm font-medium text-slate-500">Profile</span>
        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={cancel}
              className="flex items-center gap-1 text-xs px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button
              onClick={save}
              disabled={isPending}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold"
            >
              <Check className="w-3.5 h-3.5" /> {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>

      {error && (
        <div className="px-5 py-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20">{error}</div>
      )}

      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-sm text-slate-500 w-28">Name</span>
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className={inputClass}
          />
        ) : (
          <span className="text-sm text-slate-900 dark:text-white">{name || '—'}</span>
        )}
      </div>

      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-sm text-slate-500 w-28">Phone</span>
        {editing ? (
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 000 0000"
            className={inputClass}
          />
        ) : (
          <span className="text-sm text-slate-900 dark:text-white">{phone || '—'}</span>
        )}
      </div>
    </div>
  )
}
