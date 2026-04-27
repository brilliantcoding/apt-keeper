import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: invoice, error } = await (supabase as any)
    .from('invoices')
    .select('*, bills(bill_types(name))')
    .eq('id', id)
    .single()

  if (error || !invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const remaining = invoice.amount_due - invoice.amount_paid
  if (remaining <= 0) return NextResponse.json({ error: 'Already paid' }, { status: 400 })

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${(invoice.bills as any)?.bill_types?.name ?? 'Bill'} — Invoice #${invoice.id.slice(0, 8)}`,
          },
          unit_amount: remaining,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bills?paid=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bills`,
    metadata: { invoice_id: (invoice as any).id, user_id: user.id },
  })

  return NextResponse.json({ url: session.url })
}
