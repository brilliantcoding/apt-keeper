'use client'

import { useState, useTransition } from 'react'
import { toggleNotificationPref } from '@/app/dashboard/actions'

export function NotificationToggle({
  channel,
  eventType,
  initialEnabled,
}: {
  channel: string
  eventType: string
  initialEnabled: boolean
}) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const next = !enabled
    setEnabled(next)
    startTransition(async () => {
      await toggleNotificationPref(channel, eventType, next)
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      role="switch"
      aria-checked={enabled}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
        enabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
      } ${isPending ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
          enabled ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
