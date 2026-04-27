'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'

function revalidateAll() {
  revalidatePath('/admin/notices')
  // revalidate the entire /dashboard tree so the layout re-fetches notices
  revalidatePath('/dashboard', 'layout')
}

export async function createNotice(data: {
  title: string
  content: string
  priority: string
  expires_at: string | null
  managed_by: string
}) {
  const supabase = createAdminClient()
  const { error } = await (supabase as any).from('notices').insert({
    title: data.title,
    content: data.content || null,
    priority: data.priority,
    expires_at: data.expires_at || null,
    created_by: data.managed_by,
    is_active: true,
  })
  if (error) return { error: error.message }
  revalidateAll()
  return { error: null }
}

export async function toggleNotice(id: string, is_active: boolean) {
  const supabase = createAdminClient()
  const { error } = await (supabase as any)
    .from('notices')
    .update({ is_active })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidateAll()
  return { error: null }
}

export async function deleteNotice(id: string) {
  const supabase = createAdminClient()
  const { error } = await (supabase as any).from('notices').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidateAll()
  return { error: null }
}
