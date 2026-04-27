'use client'

import { useState, useTransition } from 'react'
import { Zap } from 'lucide-react'
import { generateInvoicesNow } from '@/app/admin/actions'

export function GenerateInvoicesButton() {
  const [result, setResult] = useState<{ message: string; error?: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    setResult(null)
    startTransition(async () => {
      const res = await generateInvoicesNow()
      setResult(res)
      setTimeout(() => setResult(null), 5000)
    })
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span
          className={`text-sm px-3 py-1.5 rounded-lg ${
            result.error
              ? 'bg-red-50 text-red-700'
              : 'bg-green-50 text-green-700'
          }`}
        >
          {result.error ? `Error: ${result.error}` : result.message}
        </span>
      )}
      <button
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        <Zap className="w-4 h-4" />
        {isPending ? 'Generating…' : 'Generate Invoices'}
      </button>
    </div>
  )
}
