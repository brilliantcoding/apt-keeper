'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'

export function RevokeCodeButton({ codeId }: { codeId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function revoke() {
    setLoading(true)
    await fetch(`/api/v1/activation-codes/${codeId}/revoke`, { method: 'POST' })
    setLoading(false)
    setConfirming(false)
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={revoke}
          disabled={loading}
          className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {loading ? 'Revoking…' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 transition-colors"
    >
      <XCircle className="w-3.5 h-3.5" />
      Revoke
    </button>
  )
}
