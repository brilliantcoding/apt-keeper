import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const adminClient = createAdminClient()
  const { data: profile } = await (adminClient as any)
    .from('users')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role ?? 'resident') as 'resident' | 'manager' | 'staff' | 'super_admin'

  if (role === 'resident') redirect('/dashboard')

  return (
    <AppShell role={role} userName={profile?.full_name ?? user.email ?? 'User'}>
      {children}
    </AppShell>
  )
}
