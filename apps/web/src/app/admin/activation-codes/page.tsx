import { createAdminClient, createClient } from '@/lib/supabase/server'
import { KeyRound } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { GenerateCodeForm } from '@/components/admin/GenerateCodeForm'
import { RevokeCodeButton } from '@/components/admin/RevokeCodeButton'

export default async function ActivationCodesPage() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  const admin = createAdminClient()

  const { data: codes } = await (admin as any)
    .from('activation_codes')
    .select(`
      id, code, email, status, created_at, expires_at, used_at,
      used_by_user:users!activation_codes_used_by_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false })

  const active = (codes ?? []).filter((c: any) => c.status === 'active').length
  const used = (codes ?? []).filter((c: any) => c.status === 'used').length

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <KeyRound className="w-6 h-6" />
          Activation Codes
        </h1>
        <p className="text-slate-500 mt-1">Generate invite codes to control who can register</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total" value={String((codes ?? []).length)} />
        <StatCard label="Active" value={String(active)} color="green" />
        <StatCard label="Used" value={String(used)} color="slate" />
      </div>

      {/* Generate form */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Generate new code</h2>
        <GenerateCodeForm />
      </div>

      {/* Codes table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 text-left">
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Code</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Assigned to</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Used by</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Created</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Expires</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {((codes ?? []) as any[]).map((c: any) => {
              const usedByUser = c.used_by_user
              return (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-4">
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 tracking-wider">
                      {c.code}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                    {c.email || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                    {usedByUser ? (
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {usedByUser.full_name || usedByUser.email}
                        </p>
                        {c.used_at && (
                          <p className="text-xs text-slate-400">{formatDate(c.used_at)}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{formatDate(c.created_at)}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs">
                    {c.expires_at ? formatDate(c.expires_at) : <span className="text-slate-400">Never</span>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {c.status === 'active' && <RevokeCodeButton codeId={c.id} />}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!(codes ?? []).length && (
          <div className="py-16 text-center text-slate-400">
            No activation codes yet. Generate one above.
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color = 'slate' }: { label: string; value: string; color?: string }) {
  const colors: Record<string, string> = {
    green: 'border-l-green-500',
    slate: 'border-l-slate-400',
    amber: 'border-l-amber-500',
  }
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-l-4 ${colors[color] ?? colors.slate} p-4`}>
      <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    used: 'bg-slate-100 text-slate-600',
    revoked: 'bg-red-100 text-red-700',
    expired: 'bg-amber-100 text-amber-700',
  }
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}
