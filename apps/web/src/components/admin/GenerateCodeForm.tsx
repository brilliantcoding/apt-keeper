'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Mail, Send } from 'lucide-react'

export function GenerateCodeForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setGeneratedCode(null)
    setEmailSent(false)

    const res = await fetch('/api/v1/activation-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim() || null,
        expiresInDays: expiresInDays ? parseInt(expiresInDays) : null,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to generate code')
    } else {
      setGeneratedCode(data.code)
      if (email.trim()) setEmailSent(true)
      router.refresh()
    }
    setLoading(false)
  }

  async function copyCode() {
    if (!generatedCode) return
    await navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function reset() {
    setGeneratedCode(null)
    setEmail('')
    setExpiresInDays('')
    setEmailSent(false)
    setError(null)
  }

  if (generatedCode) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5">
          <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-3">Code generated successfully!</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white dark:bg-slate-800 border border-green-200 dark:border-green-700 rounded-lg px-4 py-3 font-mono text-xl font-bold tracking-widest text-slate-900 dark:text-white text-center">
              {generatedCode}
            </div>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {emailSent && (
            <div className="flex items-center gap-2 mt-3 text-sm text-green-700 dark:text-green-400">
              <Send className="w-4 h-4" />
              Activation email sent to <strong>{email}</strong>
            </div>
          )}
        </div>
        <button
          onClick={reset}
          className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline underline-offset-2"
        >
          Generate another code
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleGenerate} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Resident email
              <span className="text-slate-400 font-normal">(optional)</span>
            </span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            placeholder="resident@example.com"
          />
          <p className="text-xs text-slate-400 mt-1">Code will be emailed automatically if provided</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Expires in (days)
            <span className="text-slate-400 font-normal ml-1">(optional)</span>
          </label>
          <input
            type="number"
            min="1"
            max="365"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            placeholder="e.g. 7"
          />
          <p className="text-xs text-slate-400 mt-1">Leave blank for no expiry</p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm"
      >
        {loading ? 'Generating…' : 'Generate code'}
      </button>
    </form>
  )
}
