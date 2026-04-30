'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, CheckCircle2 } from 'lucide-react'

export default function ActivatePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/v1/activation-codes/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Invalid code')
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  // Auto-format input as APT-XXXX-XXXX
  function handleCodeChange(val: string) {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '')
    let formatted = clean
    if (clean.length > 3) formatted = `APT-${clean.slice(3, 7)}`
    if (clean.length > 7) formatted = `APT-${clean.slice(3, 7)}-${clean.slice(7, 11)}`
    // If user typed the full APT- prefix themselves, handle gracefully
    if (val.startsWith('APT-') || val.startsWith('apt-')) {
      const raw = val.toUpperCase().replace(/[^A-Z0-9]/g, '')
      const part1 = raw.slice(0, 3) // APT
      const part2 = raw.slice(3, 7)
      const part3 = raw.slice(7, 11)
      if (part2) formatted = `${part1}-${part2}`
      if (part3) formatted = `${part1}-${part2}-${part3}`
      if (!part2) formatted = part1
    }
    setCode(formatted)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            A
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">AptKeeper</h1>
            <p className="text-sm text-slate-500">Apartment Management Platform</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Activated!</h2>
            <p className="text-slate-500">Taking you to your dashboard…</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Enter activation code</h2>
            </div>
            <p className="text-slate-500 text-sm mb-6 ml-[52px]">
              Your property manager sent you an activation code. Enter it below to access your account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Activation code
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-lg tracking-widest text-center uppercase"
                  placeholder="APT-XXXX-XXXX"
                  maxLength={13}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || code.length < 11}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Verifying…' : 'Activate account'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-400 mt-6">
              Don&apos;t have a code? Contact your property manager.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
