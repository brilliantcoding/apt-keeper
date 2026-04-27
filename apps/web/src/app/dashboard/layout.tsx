import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient()

  const [{ data: profile }, { data: noticeRows, error: noticeError }] = await Promise.all([
    (admin as any).from('users').select('full_name, role').eq('id', user.id).single(),
    (admin as any)
      .from('notices')
      .select('id, title, content, priority, expires_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
  ])

  const role = (profile?.role ?? 'resident') as 'resident' | 'manager' | 'staff' | 'super_admin'
  if (role !== 'resident') redirect('/admin')

  const now = new Date()
  const notices = ((noticeRows ?? []) as any[]).filter(
    (n: any) => !n.expires_at || new Date(n.expires_at) > now
  )

  // Build scrolling ticker text from all notices
  const tickerText = notices
    .map((n: any) => `${n.priority === 'urgent' ? '🔴 ' : '📢 '}${n.title}${n.content ? ` — ${n.content}` : ''}`)
    .join('     ·     ')

  const hasUrgent = notices.some((n: any) => n.priority === 'urgent')

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} userName={profile?.full_name ?? user.email ?? 'User'} />
      <div className="flex-1 flex flex-col min-h-screen">
        {notices.length > 0 && (
          <div
            className={`w-full overflow-hidden flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${
              hasUrgent
                ? 'bg-red-600 text-white'
                : 'bg-amber-400 text-amber-950'
            }`}
            style={{ minHeight: '40px' }}
          >
            <span className="flex-shrink-0 text-base">
              {hasUrgent ? '🔴' : '📢'}
            </span>
            <div className="flex-1 overflow-hidden">
              <div
                style={{
                  display: 'inline-block',
                  whiteSpace: 'nowrap',
                  animation: 'ticker-scroll 30s linear infinite',
                  paddingLeft: '100%',
                }}
              >
                {tickerText}
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-6 bg-slate-50 dark:bg-slate-950 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
