import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmail, buildPaymentConfirmationEmail } from '@/lib/notifications/email'

function parsePaymentLabel(paymentDetails: any): string {
  if (!paymentDetails || typeof paymentDetails !== 'object') return 'Card'
  const { method } = paymentDetails
  if (method === 'card') {
    const num = (paymentDetails.number ?? '').replace(/\s/g, '')
    const last4 = num.slice(-4)
    return last4 ? `Card ····${last4}` : 'Card'
  }
  if (method === 'ach') return `ACH — ${paymentDetails.bank || 'Bank transfer'}`
  if (method === 'wire') return `Wire — ${paymentDetails.bank || 'Wire transfer'}`
  return 'Payment'
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invoiceId, paymentDetails } = await req.json()
  if (!invoiceId) return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })

  const admin = createAdminClient()

  const { data: invoice, error } = await (admin as any)
    .from('invoices')
    .select(`
      id, amount_due, amount_paid, lease_id,
      bills(bill_types(name)),
      units(unit_number)
    `)
    .eq('id', invoiceId)
    .single()

  if (error || !invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const { data: lease } = await (admin as any)
    .from('leases')
    .select('resident_id')
    .eq('id', invoice.lease_id)
    .single()

  if (lease?.resident_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const remaining = invoice.amount_due - invoice.amount_paid
  if (remaining <= 0) return NextResponse.json({ error: 'Already paid' }, { status: 400 })

  const paymentMethodStr = paymentDetails ? JSON.stringify(paymentDetails) : 'card'
  const paidAt = new Date().toISOString()

  await (admin as any).from('payments').insert({
    invoice_id: invoiceId,
    amount: remaining,
    payment_method: paymentMethodStr,
    status: 'succeeded',
    paid_at: paidAt,
  })

  await (admin as any).from('invoices').update({
    amount_paid: invoice.amount_due,
    status: 'paid',
  }).eq('id', invoiceId)

  // Send confirmation email (fire-and-forget — don't block response)
  const { data: residentUser } = await (admin as any)
    .from('users')
    .select('email, full_name')
    .eq('id', user.id)
    .single()

  if (residentUser?.email) {
    const billName = (invoice.bills as any)?.bill_types?.name ?? 'Bill'
    const paymentLabel = parsePaymentLabel(paymentDetails)
    const { subject, html } = buildPaymentConfirmationEmail({
      residentName: residentUser.full_name || residentUser.email,
      unitNumber: invoice.units?.unit_number ?? '',
      amountPaid: remaining,
      billDescription: billName,
      paidAt,
      paymentLabel,
    })
    sendEmail(residentUser.email, subject, html).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
