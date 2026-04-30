import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/notifications/email'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `APT-${seg(4)}-${seg(4)}`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await (admin as any).from('users').select('role').eq('id', user.id).single()
  const isAdmin = ['manager', 'super_admin', 'staff'].includes(profile?.role)
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, expiresInDays } = await req.json()

  const code = generateCode()
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
    : null

  const { data: record, error } = await (admin as any)
    .from('activation_codes')
    .insert({
      code,
      email: email || null,
      created_by: user.id,
      expires_at: expiresAt,
      status: 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send email if address was provided
  if (email) {
    const { data: senderProfile } = await (admin as any)
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()
    const senderName = senderProfile?.full_name || 'Your property manager'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const expiryNote = expiresInDays ? `This code expires in ${expiresInDays} day${expiresInDays > 1 ? 's' : ''}.` : 'This code does not expire.'

    await sendEmail(
      email,
      '[AptKeeper] Your activation code',
      `<div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#16a34a">AptKeeper</h2>
        <p>Hi there,</p>
        <p>${senderName} has invited you to join AptKeeper. Use the activation code below to complete your registration.</p>
        <div style="margin:24px 0;padding:20px;background:#f0fdf4;border:2px dashed #16a34a;border-radius:8px;text-align:center">
          <p style="margin:0 0 8px;font-size:13px;color:#64748b">Your activation code</p>
          <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:4px;color:#15803d;font-family:monospace">${code}</p>
        </div>
        <p style="color:#64748b;font-size:14px">${expiryNote}</p>
        <a href="${appUrl}/login" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
          Sign up now
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">AptKeeper — Apartment Management Platform</p>
      </div>`
    ).catch(() => {})
  }

  return NextResponse.json({ code: record.code, id: record.id })
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await (admin as any).from('users').select('role').eq('id', user.id).single()
  const isAdmin = ['manager', 'super_admin', 'staff'].includes(profile?.role)
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: codes } = await (admin as any)
    .from('activation_codes')
    .select(`
      id, code, email, status, created_at, expires_at, used_at,
      used_by_user:users!activation_codes_used_by_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false })

  return NextResponse.json({ codes: codes ?? [] })
}
