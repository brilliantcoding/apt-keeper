import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role ?? 'resident') as 'resident' | 'manager' | 'staff' | 'super_admin'

  if (role === 'resident') redirect('/dashboard')

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} userName={profile?.full_name ?? user.email ?? 'User'} />
      <main className="flex-1 p-6 bg-slate-50 dark:bg-slate-950 overflow-auto">{children}</main>
    </div>
  )
}
