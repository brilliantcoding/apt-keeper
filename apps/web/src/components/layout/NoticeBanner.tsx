'use client'

import { useState, useEffect } from 'react'
import { Megaphone, X, ChevronLeft, ChevronRight } from 'lucide-react'

interface Notice {
  id: string
  title: string
  content: string | null
  priority: string
}

export function NoticeBanner({ notices }: { notices: Notice[] }) {
  const [index, setIndex] = useState(0)
  const [hidden, setHidden] = useState<string[]>([])

  const active = notices.filter((n) => !hidden.includes(n.id))

  // Auto-rotate every 5 s when multiple notices
  useEffect(() => {
    if (active.length <= 1) return
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % active.length)
    }, 5000)
    return () => clearInterval(t)
  }, [active.length])

  // Keep index in bounds after dismiss
  const safeIndex = active.length > 0 ? index % active.length : 0
  const notice = active[safeIndex]

  if (!notice) return null

  const urgent = notice.priority === 'urgent'

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        urgent
          ? 'flex items-center gap-3 px-4 py-2.5 bg-red-600 text-white text-sm'
          : 'flex items-center gap-3 px-4 py-2.5 bg-amber-400 text-amber-950 text-sm'
      }
    >
      <Megaphone className="w-4 h-4 flex-shrink-0" />

      <p className="flex-1 font-medium truncate">
        {notice.title}
        {notice.content && (
          <span className="font-normal opacity-80 ml-2">— {notice.content}</span>
        )}
      </p>

      {active.length > 1 && (
        <div className="flex items-center gap-1 text-xs flex-shrink-0">
          <button
            aria-label="Previous notice"
            onClick={() => setIndex((i) => (i - 1 + active.length) % active.length)}
            className="p-0.5 rounded hover:opacity-70"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="w-8 text-center tabular-nums">{safeIndex + 1}/{active.length}</span>
          <button
            aria-label="Next notice"
            onClick={() => setIndex((i) => (i + 1) % active.length)}
            className="p-0.5 rounded hover:opacity-70"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <button
        aria-label="Dismiss notice"
        onClick={() => setHidden((h) => [...h, notice.id])}
        className="p-0.5 rounded hover:opacity-70 flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
