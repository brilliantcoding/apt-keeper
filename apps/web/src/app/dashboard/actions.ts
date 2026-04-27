'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function toggleNotificationPref(
  channel: string,
  eventType: string,
  enabled: boolean
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { error } = await (admin as any)
    .from('notification_preferences')
    .upsert(
      { user_id: user.id, channel, event_type: eventType, enabled },
      { onConflict: 'user_id,channel,event_type' }
    )

  if (error) return { error: error.message }
  revalidatePath('/dashboard/notifications')
  return { error: null }
}

export async function submitMaintenanceRequest(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const priority = (formData.get('priority') as string) ?? 'P3'
  const photo = formData.get('photo') as File | null

  if (!title || !description) return { error: 'Title and description are required' }

  const { data: lease } = await (supabase as any)
    .from('leases')
    .select('unit_id')
    .eq('resident_id', user.id)
    .eq('status', 'active')
    .single()

  if (!lease) return { error: 'No active lease found. Contact your property manager.' }

  const SLA_HOURS: Record<string, number> = { P1: 4, P2: 24, P3: 72, P4: 168 }
  const slaDeadline = new Date(
    Date.now() + (SLA_HOURS[priority] ?? 72) * 3_600_000
  ).toISOString()

  const admin = createAdminClient()
  const { data: request, error } = await (admin as any)
    .from('maintenance_requests')
    .insert({
      unit_id: lease.unit_id,
      resident_id: user.id,
      title,
      description,
      priority,
      status: 'open',
      sla_deadline: slaDeadline,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  if (photo && photo.size > 0 && request) {
    const buffer = await photo.arrayBuffer()
    const path = `maintenance/${request.id}/${Date.now()}-${photo.name}`
    const { error: uploadError } = await (admin as any).storage
      .from('maintenance-photos')
      .upload(path, buffer, { contentType: photo.type })

    if (!uploadError) {
      await (admin as any).from('maintenance_photos').insert({
        request_id: request.id,
        storage_path: path,
        uploaded_by: user.id,
      })
    }
  }

  revalidatePath('/dashboard/maintenance')
  revalidatePath('/dashboard')
  return { error: null }
}
