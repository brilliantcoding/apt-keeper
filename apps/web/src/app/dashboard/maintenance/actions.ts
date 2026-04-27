'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function addMaintenanceComment(requestId: string, body: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { error } = await (admin as any).from('maintenance_comments').insert({
    request_id: requestId,
    author_id: user.id,
    body,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/maintenance')
  return { error: null }
}
