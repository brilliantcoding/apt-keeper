import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const invoiceId = session.metadata?.invoice_id
    const userId = session.metadata?.user_id
    if (!invoiceId) return NextResponse.json({ received: true })

    const supabase = createAdminClient()

    await supabase.from('payments').insert({
      invoice_id: invoiceId,
      amount: session.amount_total ?? 0,
      payment_method: 'stripe',
      stripe_payment_intent_id: session.payment_intent as string,
      status: 'succeeded',
      paid_at: new Date().toISOString(),
    })

    const { data: invoice } = await supabase
      .from('invoices')
      .select('amount_due, amount_paid')
      .eq('id', invoiceId)
      .single()

    if (invoice) {
      const newPaid = invoice.amount_paid + (session.amount_total ?? 0)
      const newStatus = newPaid >= invoice.amount_due ? 'paid' : 'partial'
      await supabase
        .from('invoices')
        .update({ amount_paid: newPaid, status: newStatus })
        .eq('id', invoiceId)
    }

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'invoice_paid',
      entity_type: 'invoice',
      entity_id: invoiceId,
      metadata: { amount: session.amount_total, stripe_session: session.id },
    })
  }

  return NextResponse.json({ received: true })
}
