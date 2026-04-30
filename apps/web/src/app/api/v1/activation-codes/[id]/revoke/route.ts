import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await (admin as any).from('users').select('role').eq('id', user.id).single()
  const isAdmin = ['manager', 'super_admin', 'staff'].includes(profile?.role)
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await (admin as any)
    .from('activation_codes')
    .update({ status: 'revoked' })
    .eq('id', id)
    .eq('status', 'active') // only revoke active codes

  return NextResponse.json({ success: true })
}
