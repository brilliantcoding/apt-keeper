'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Power, X } from 'lucide-react'
import { createNotice, toggleNotice, deleteNotice } from '@/app/admin/notices/actions'

const PRIORITIES = [
  { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
]

interface Notice {
  id: string
  title: string
  content: string | null
  is_active: boolean
  priority: string
  expires_at: string | null
  created_at: string
}

export function NoticeManager({ notices, managerId }: { notices: Notice[]; managerId: string }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState('normal')
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function resetForm() {
    setTitle(''); setContent(''); setPriority('normal'); setExpiresAt(''); setError(null); setShowForm(false)
  }

  function handleCreate() {
    if (!title.trim()) { setError('Title is required'); return }
    if (expiresAt && new Date(expiresAt) < new Date()) { setError('Expiry time is already in the past'); return }
    setError(null)
    startTransition(async () => {
      const result = await createNotice({ title: title.trim(), content, priority, expires_at: expiresAt || null, managed_by: managerId })
      if (result.error) setError(result.error)
      else { resetForm(); router.refresh() }
    })
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      await toggleNotice(id, !current)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteNotice(id)
      setConfirmDeleteId(null)
      router.refresh()
    })
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

  const active = notices.filter((n) => n.is_active)
  const inactive = notices.filter((n) => !n.is_active)

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <span className="font-semibold text-slate-900 dark:text-white">New Notice</span>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium">
              <Plus className="w-4 h-4" /> Add notice
            </button>
          )}
        </div>

        {showForm && (
          <div className="p-5 space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Water shutoff on May 3rd" className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Details (optional)</label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={2} placeholder="Additional details…" className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
                  {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Expires (optional, your local time)
                </label>
                <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inputClass} />
                {expiresAt && new Date(expiresAt) < new Date() && (
                  <p className="text-xs text-red-500 mt-1">⚠ This time is already in the past</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={resetForm} className="flex items-center gap-1 text-xs px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button onClick={handleCreate} disabled={isPending || !title.trim()} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold">
                <Plus className="w-3.5 h-3.5" /> {isPending ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active notices */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Active ({active.length}) — showing on resident dashboard
        </h2>
        {active.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border p-8 text-center text-slate-400 text-sm">No active notices.</div>
        ) : (
          <div className="space-y-2">
            {active.map((n) => <NoticeCard key={n.id} notice={n} onToggle={handleToggle} onDelete={(id) => setConfirmDeleteId(id)} confirmDeleteId={confirmDeleteId} onConfirmDelete={handleDelete} onCancelDelete={() => setConfirmDeleteId(null)} isPending={isPending} />)}
          </div>
        )}
      </div>

      {/* Inactive notices */}
      {inactive.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Inactive ({inactive.length})</h2>
          <div className="space-y-2 opacity-60">
            {inactive.map((n) => <NoticeCard key={n.id} notice={n} onToggle={handleToggle} onDelete={(id) => setConfirmDeleteId(id)} confirmDeleteId={confirmDeleteId} onConfirmDelete={handleDelete} onCancelDelete={() => setConfirmDeleteId(null)} isPending={isPending} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function NoticeCard({ notice, onToggle, onDelete, confirmDeleteId, onConfirmDelete, onCancelDelete, isPending }: {
  notice: Notice
  onToggle: (id: string, current: boolean) => void
  onDelete: (id: string) => void
  confirmDeleteId: string | null
  onConfirmDelete: (id: string) => void
  onCancelDelete: () => void
  isPending: boolean
}) {
  const priorityColor = notice.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
  const isExpired = notice.expires_at && new Date(notice.expires_at) < new Date()

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border px-5 py-4 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${priorityColor}`}>{notice.priority}</span>
          {isExpired && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">expired</span>}
          <p className="font-semibold text-slate-900 dark:text-white text-sm">{notice.title}</p>
        </div>
        {notice.content && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{notice.content}</p>}
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
          <span>{new Date(notice.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          {notice.expires_at && <span>Expires {new Date(notice.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onToggle(notice.id, notice.is_active)}
          disabled={isPending}
          title={notice.is_active ? 'Deactivate' : 'Activate'}
          className={`p-1.5 rounded-lg border transition-colors disabled:opacity-50 ${notice.is_active ? 'border-green-200 bg-green-50 text-green-600 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <Power className="w-3.5 h-3.5" />
        </button>

        {confirmDeleteId === notice.id ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-red-600">Delete?</span>
            <button onClick={() => onConfirmDelete(notice.id)} disabled={isPending} className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50">Yes</button>
            <button onClick={onCancelDelete} className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400">No</button>
          </div>
        ) : (
          <button onClick={() => onDelete(notice.id)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
