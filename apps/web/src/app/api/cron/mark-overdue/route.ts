import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Mark pending invoices as overdue if their due date has passed.
  // If amount_paid >= amount_due, status would already be 'paid', so
  // pending + past due_date means there's still a balance remaining.
  const { data, error } = await (supabase as any)
    .from('invoices')
    .update({ status: 'overdue' })
    .eq('status', 'pending')
    .lt('due_date', now)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: `Marked ${data?.length ?? 0} invoices as overdue` })
}
