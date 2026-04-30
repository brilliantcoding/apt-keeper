import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

  const admin = createAdminClient()

  const { data: record, error } = await (admin as any)
    .from('activation_codes')
    .select('id, code, email, status, expires_at')
    .eq('code', code.trim().toUpperCase())
    .single()

  if (error || !record) {
    return NextResponse.json({ error: 'Invalid activation code' }, { status: 400 })
  }

  if (record.status === 'used') {
    return NextResponse.json({ error: 'This code has already been used' }, { status: 400 })
  }

  if (record.status === 'revoked') {
    return NextResponse.json({ error: 'This code has been revoked' }, { status: 400 })
  }

  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    await (admin as any).from('activation_codes').update({ status: 'expired' }).eq('id', record.id)
    return NextResponse.json({ error: 'This code has expired' }, { status: 400 })
  }

  // If the code was assigned to a specific email, verify it matches
  if (record.email && record.email.toLowerCase() !== user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'This code was issued for a different email address' }, { status: 400 })
  }

  // Mark code as used
  await (admin as any)
    .from('activation_codes')
    .update({ status: 'used', used_by: user.id, used_at: new Date().toISOString() })
    .eq('id', record.id)

  // Mark user as activated
  await (admin as any)
    .from('users')
    .update({ activation_code_id: record.id })
    .eq('id', user.id)

  return NextResponse.json({ success: true })
}
