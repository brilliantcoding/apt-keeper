'use client'

import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { sendPasswordReset } from '@/app/admin/actions'

export function ResetPasswordButton({ userId, email }: { userId: string; email: string }) {
  const [state, setState] = useState<'idle' | 'confirming' | 'loading' | 'done' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function handleReset() {
    setState('loading')
    const { error } = await sendPasswordReset(userId)
    if (error) {
      setErrMsg(error)
      setState('error')
    } else {
      setState('done')
    }
  }

  if (state === 'done') {
    return <span className="text-xs text-green-600 font-semibold">Reset sent</span>
  }

  if (state === 'error') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-500">{errMsg}</span>
        <button onClick={() => setState('idle')} className="text-xs text-slate-400 hover:text-slate-600">Dismiss</button>
      </div>
    )
  }

  if (state === 'confirming') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Send reset to {email}?</span>
        <button
          onClick={handleReset}
          className="text-xs font-semibold text-amber-600 hover:text-amber-700"
        >
          Confirm
        </button>
        <button onClick={() => setState('idle')} className="text-xs text-slate-400 hover:text-slate-600">
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setState('confirming')}
      className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-600 transition-colors"
    >
      <KeyRound className="w-3.5 h-3.5" />
      Reset pwd
    </button>
  )
}
