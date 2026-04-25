'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

export function PayButton({ invoiceId, amount }: { invoiceId: string; amount: number }) {
  const [loading, setLoading] = useState(false)

  async function handlePay() {
    setLoading(true)
    const res = await fetch(`/api/v1/invoices/${invoiceId}/pay`, { method: 'POST' })
    const { url } = await res.json()
    if (url) window.location.href = url
    else setLoading(false)
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
    >
      {loading ? 'Loading…' : `Pay ${formatCurrency(amount)}`}
    </button>
  )
}
