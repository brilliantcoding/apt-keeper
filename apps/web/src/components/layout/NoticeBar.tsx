import { createAdminClient } from '@/lib/supabase/server'
import { NoticeBanner } from './NoticeBanner'

export async function NoticeBar() {
  const admin = createAdminClient()

  const { data, error } = await (admin as any)
    .from('notices')
    .select('id, title, content, priority, expires_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[NoticeBar] fetch error:', error.message)
    return null
  }

  const now = new Date()
  const notices = ((data ?? []) as any[]).filter(
    (n: any) => !n.expires_at || new Date(n.expires_at) > now
  )

  if (notices.length === 0) return null

  return <NoticeBanner notices={notices} />
}
