import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Megaphone } from 'lucide-react'
import { NoticeManager } from '@/components/admin/NoticeManager'

export default async function AdminNoticesPage() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  const supabase = createAdminClient()

  const { data: notices } = await (supabase as any)
    .from('notices')
    .select('id, title, content, is_active, priority, expires_at, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Megaphone className="w-6 h-6" />
          Notices
        </h1>
        <p className="text-slate-500 mt-1">
          Active notices scroll as a banner on the resident dashboard.
        </p>
      </div>
      <NoticeManager notices={(notices ?? []) as any[]} managerId={user!.id} />
    </div>
  )
}
