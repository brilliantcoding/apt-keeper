'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, MessageSquare, Send, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { addMaintenanceComment } from '@/app/dashboard/maintenance/actions'

const PRIORITY_COLORS: Record<string, string> = {
  P1: 'border-l-red-500',
  P2: 'border-l-orange-500',
  P3: 'border-l-amber-500',
  P4: 'border-l-blue-500',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-600',
}

interface Comment {
  id: string
  body: string
  created_at: string
  author_id: string
  users: { full_name: string | null; email: string; role: string } | null
}

interface Props {
  request: {
    id: string
    title: string
    description: string
    priority: string
    status: string
    created_at: string
    sla_deadline: string | null
  }
  comments: Comment[]
  userId: string
}

export function MaintenanceRequestCard({ request, comments, userId }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const isClosed = request.status === 'completed' || request.status === 'closed'
  const slaDate = request.sla_deadline ? new Date(request.sla_deadline) : null
  const slaBreached = slaDate && slaDate < new Date() && !isClosed

  function submitComment() {
    if (!comment.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addMaintenanceComment(request.id, comment.trim())
      if (result.error) {
        setError(result.error)
      } else {
        setComment('')
        router.refresh()
      }
    })
  }

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-l-4 ${PRIORITY_COLORS[request.priority] ?? 'border-l-slate-300'}`}>
      {/* Header — always visible, click to expand */}
      <button
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400">{request.priority}</span>
            <h3 className="font-semibold text-slate-900 dark:text-white">{request.title}</h3>
            {comments.length > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-slate-400">
                <MessageSquare className="w-3 h-3" />{comments.length}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{request.description}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs text-slate-400">Submitted {formatDate(request.created_at)}</span>
            {slaBreached && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <Clock className="w-3 h-3" /> SLA breached
              </span>
            )}
            {slaDate && !slaBreached && !isClosed && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3 h-3" /> Due {formatDate(slaDate.toISOString())}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize whitespace-nowrap ${STATUS_COLORS[request.status] ?? 'bg-slate-100 text-slate-600'}`}>
            {request.status.replace('_', ' ')}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4 space-y-4">
          {/* Full description */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{request.description}</p>
          </div>

          {/* Comments thread */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Comments {comments.length > 0 && `(${comments.length})`}
            </p>
            {comments.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No comments yet.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => {
                  const isMe = c.author_id === userId
                  const isManager = c.users?.role === 'manager' || c.users?.role === 'super_admin'
                  const name = c.users?.full_name || c.users?.email || 'Unknown'
                  return (
                    <div key={c.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isManager ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {name[0]?.toUpperCase()}
                      </div>
                      <div className={`max-w-[80%] ${isMe ? 'items-end' : ''}`}>
                        <div className={`flex items-center gap-2 mb-0.5 ${isMe ? 'justify-end' : ''}`}>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {isMe ? 'You' : name}
                          </span>
                          {isManager && !isMe && (
                            <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full">Manager</span>
                          )}
                          <span className="text-xs text-slate-400">{formatDate(c.created_at)}</span>
                        </div>
                        <div className={`px-3 py-2 rounded-xl text-sm ${isMe ? 'bg-green-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'}`}>
                          {c.body}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Add comment */}
          {!isClosed && (
            <div className="pt-1">
              {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
                  rows={2}
                  placeholder="Add a comment… (Enter to send)"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
                <button
                  onClick={submitComment}
                  disabled={isPending || !comment.trim()}
                  className="p-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
