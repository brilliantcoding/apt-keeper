import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const SLA_HOURS: Record<string, { response: number; resolution: number }> = {
  P1: { response: 1, resolution: 4 },
  P2: { response: 4, resolution: 24 },
  P3: { response: 24, resolution: 72 },
  P4: { response: 48, resolution: 168 },
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('maintenance_requests')
    .select('*, maintenance_photos(storage_path), units(unit_number)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const priority = (formData.get('priority') as string) ?? 'P3'
  const photo = formData.get('photo') as File | null

  if (!title || !description) {
    return NextResponse.json({ error: 'title and description required' }, { status: 400 })
  }

  const { data: lease } = await supabase
    .from('leases')
    .select('unit_id')
    .eq('resident_id', user.id)
    .eq('status', 'active')
    .single()

  if (!lease) return NextResponse.json({ error: 'No active lease found' }, { status: 400 })

  const slaHours = SLA_HOURS[priority] ?? SLA_HOURS['P3']
  const slaDeadline = new Date(Date.now() + slaHours.resolution * 60 * 60 * 1000).toISOString()

  const admin = createAdminClient()
  const { data: request, error } = await (admin as any)
    .from('maintenance_requests')
    .insert({
      unit_id: (lease as any).unit_id,
      resident_id: user.id,
      title,
      description,
      priority,
      status: 'open',
      sla_deadline: slaDeadline,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (photo && request) {
    const buffer = await photo.arrayBuffer()
    const path = `maintenance/${request.id}/${Date.now()}-${photo.name}`
    const { error: uploadError } = await admin.storage
      .from('maintenance-photos')
      .upload(path, buffer, { contentType: photo.type })

    if (!uploadError) {
      await admin.from('maintenance_photos').insert({
        request_id: request.id,
        storage_path: path,
        uploaded_by: user.id,
      })
    }
  }

  return NextResponse.json(request, { status: 201 })
}
