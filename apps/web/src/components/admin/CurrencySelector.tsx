'use client'

import { useTransition } from 'react'
import { updateCurrency } from '@/app/admin/actions'

export function CurrencySelector({ current }: { current: string }) {
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    startTransition(async () => {
      await updateCurrency(value)
    })
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={isPending}
      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
    >
      <option value="USD">USD — US Dollar ($)</option>
      <option value="INR">INR — Indian Rupee (₹)</option>
    </select>
  )
}
