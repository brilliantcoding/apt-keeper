'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { X, CreditCard, Building2, Landmark, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / Debit Card', icon: CreditCard, desc: 'Visa, Mastercard, Amex' },
  { id: 'ach', label: 'Bank Transfer (ACH)', icon: Building2, desc: 'US bank account' },
  { id: 'wire', label: 'Wire Transfer', icon: Landmark, desc: 'Domestic or international' },
]

function detectBrand(num: string): string {
  const n = num.replace(/\s/g, '')
  if (n.startsWith('4')) return 'Visa'
  if (n.startsWith('5')) return 'Mastercard'
  if (n.startsWith('34') || n.startsWith('37')) return 'Amex'
  if (n.startsWith('6')) return 'Discover'
  return 'Card'
}

function formatCardNumber(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2)
  return digits
}

interface CardForm { holder: string; number: string; expiry: string; cvv: string }
interface AchForm  { holder: string; routing: string; account: string }
interface WireForm { holder: string; bank: string }

function inputCls(hasVal: boolean) {
  return `w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500 transition ${hasVal ? 'border-slate-300 dark:border-slate-600' : 'border-slate-200 dark:border-slate-700'}`
}

export function PayButton({ invoiceId, amount, currency = 'USD' }: { invoiceId: string; amount: number; currency?: string }) {
  const [open, setOpen]     = useState(false)
  const [method, setMethod] = useState('card')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const router = useRouter()

  const [card, setCard]   = useState<CardForm>({ holder: '', number: '', expiry: '', cvv: '' })
  const [ach, setAch]     = useState<AchForm>({ holder: '', routing: '', account: '' })
  const [wire, setWire]   = useState<WireForm>({ holder: '', bank: '' })

  function resetForms() {
    setCard({ holder: '', number: '', expiry: '', cvv: '' })
    setAch({ holder: '', routing: '', account: '' })
    setWire({ holder: '', bank: '' })
    setMethod('card')
    setSuccess(false)
  }

  function isValid(): boolean {
    if (method === 'card') return (
      card.holder.trim().length > 0 &&
      card.number.replace(/\s/g, '').length >= 13 &&
      card.expiry.length >= 4 &&
      card.cvv.length >= 3
    )
    if (method === 'ach')  return ach.holder.trim().length > 0 && ach.routing.length >= 4 && ach.account.length >= 4
    if (method === 'wire') return wire.holder.trim().length > 0 && wire.bank.trim().length > 0
    return false
  }

  function buildPaymentDetails() {
    if (method === 'card') {
      const digits = card.number.replace(/\s/g, '')
      return { type: 'card', brand: detectBrand(digits), last4: digits.slice(-4), holder: card.holder, expiry: card.expiry }
    }
    if (method === 'ach') {
      return { type: 'ach', holder: ach.holder, routingLast4: ach.routing.slice(-4), accountLast4: ach.account.slice(-4) }
    }
    return { type: 'wire', holder: wire.holder, bank: wire.bank }
  }

  async function handleSubmit() {
    setLoading(true)
    const details = buildPaymentDetails()
    try {
      const res = await fetch('/api/v1/invoices/mock-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, paymentDetails: details }),
      })
      if (res.ok) {
        const label = method === 'card'
          ? `${details.brand} ending in ${(details as any).last4}`
          : method === 'ach'
          ? `ACH account ending in ${(details as any).accountLast4}`
          : `Wire via ${(details as any).bank}`
        setSuccessMsg(label)
        setSuccess(true)
        setTimeout(() => {
          setOpen(false)
          resetForms()
          router.refresh()
        }, 2200)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        Pay {formatCurrency(amount, currency)}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Make a Payment</h2>
                <p className="text-sm text-slate-500 mt-0.5">Amount: <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(amount, currency)}</span></p>
              </div>
              <button onClick={() => { setOpen(false); resetForms() }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {success ? (
              <div className="px-6 py-14 flex flex-col items-center gap-3">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
                <p className="text-lg font-bold text-slate-900 dark:text-white">Payment Successful!</p>
                <p className="text-sm text-slate-500 text-center">{formatCurrency(amount, currency)} paid via {successMsg}</p>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-5">

                {/* Method selector */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Payment Method</p>
                  <div className="space-y-2">
                    {PAYMENT_METHODS.map(({ id, label, icon: Icon, desc }) => (
                      <button
                        key={id}
                        onClick={() => setMethod(id)}
                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border-2 transition-colors text-left ${
                          method === id ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${method === id ? 'bg-green-100 dark:bg-green-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                          <Icon className={`w-4 h-4 ${method === id ? 'text-green-600' : 'text-slate-500'}`} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${method === id ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>{label}</p>
                          <p className="text-xs text-slate-400">{desc}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${method === id ? 'border-green-500' : 'border-slate-300'}`}>
                          {method === id && <div className="w-2 h-2 rounded-full bg-green-500" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Card fields ── */}
                {method === 'card' && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Card Details</p>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        placeholder="John Smith"
                        value={card.holder}
                        onChange={e => setCard(c => ({ ...c, holder: e.target.value }))}
                        className={inputCls(!!card.holder)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Card Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="1234 5678 9012 3456"
                          value={card.number}
                          onChange={e => setCard(c => ({ ...c, number: formatCardNumber(e.target.value) }))}
                          className={inputCls(!!card.number) + ' pr-16'}
                        />
                        {card.number.replace(/\s/g,'').length >= 1 && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                            {detectBrand(card.number)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="MM/YY"
                          value={card.expiry}
                          onChange={e => setCard(c => ({ ...c, expiry: formatExpiry(e.target.value) }))}
                          className={inputCls(!!card.expiry)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">CVV</label>
                        <input
                          type="password"
                          inputMode="numeric"
                          placeholder="•••"
                          maxLength={4}
                          value={card.cvv}
                          onChange={e => setCard(c => ({ ...c, cvv: e.target.value.replace(/\D/g,'').slice(0,4) }))}
                          className={inputCls(!!card.cvv)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── ACH fields ── */}
                {method === 'ach' && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bank Account Details</p>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        placeholder="John Smith"
                        value={ach.holder}
                        onChange={e => setAch(a => ({ ...a, holder: e.target.value }))}
                        className={inputCls(!!ach.holder)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Routing Number (9 digits)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="021000021"
                        value={ach.routing}
                        onChange={e => setAch(a => ({ ...a, routing: e.target.value.replace(/\D/g,'').slice(0,9) }))}
                        className={inputCls(!!ach.routing)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Account Number</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="••••••••••"
                        value={ach.account}
                        onChange={e => setAch(a => ({ ...a, account: e.target.value.replace(/\D/g,'').slice(0,17) }))}
                        className={inputCls(!!ach.account)}
                      />
                    </div>
                  </div>
                )}

                {/* ── Wire fields ── */}
                {method === 'wire' && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Wire Transfer Details</p>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Beneficiary Name</label>
                      <input
                        type="text"
                        placeholder="John Smith"
                        value={wire.holder}
                        onChange={e => setWire(w => ({ ...w, holder: e.target.value }))}
                        className={inputCls(!!wire.holder)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Bank Name</label>
                      <input
                        type="text"
                        placeholder="Chase Bank"
                        value={wire.bank}
                        onChange={e => setWire(w => ({ ...w, bank: e.target.value }))}
                        className={inputCls(!!wire.bank)}
                      />
                    </div>
                  </div>
                )}

                {/* Amount summary */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 flex justify-between items-center">
                  <span className="text-sm text-slate-500">Total to pay</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(amount, currency)}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pb-1">
                  <button
                    onClick={() => { setOpen(false); resetForms() }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !isValid()}
                    className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                  >
                    {loading ? 'Processing…' : 'Submit Payment'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
