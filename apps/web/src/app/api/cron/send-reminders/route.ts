import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Client as QStashClient } from '@upstash/qstash'

const REMINDER_STAGES = [
  { stage: 1, daysBefore: 7, channels: ['email'] },
  { stage: 2, daysBefore: 3, channels: ['email', 'push'] },
  { stage: 3, daysBefore: 0, channels: ['email', 'push', 'sms'] },
  { stage: 4, daysAfter: 3, channels: ['email', 'push', 'sms'] },
  { stage: 5, daysAfter: 5, channels: ['email', 'sms'] },
  { stage: 6, daysAfter: 10, channels: ['email', 'sms'] },
  { stage: 7, daysAfter: 15, channels: ['email', 'sms'] },
  { stage: 8, daysAfter: 30, channels: ['email', 'sms'] },
]

const qstash = new QStashClient({ token: process.env.QSTASH_TOKEN! })

export async function POST(req: NextRequest) {
  const supabase = await createAdminClient()
  const now = new Date()
  const queued: string[] = []

  for (const stageConfig of REMINDER_STAGES) {
    const targetDate = new Date(now)
    if ('daysBefore' in stageConfig) {
      targetDate.setDate(targetDate.getDate() + stageConfig.daysBefore!)
    } else {
      targetDate.setDate(targetDate.getDate() - (stageConfig as any).daysAfter)
    }
    const targetDateStr = targetDate.toISOString().split('T')[0]

    const { data: invoices } = await supabase
      .from('invoices')
      .select(
        `id, amount_due, amount_paid, due_date,
         leases(resident_id, users(full_name, email, phone, fcm_token)),
         bills(bill_types(name))`
      )
      .in('status', ['pending', 'overdue'])
      .eq('due_date', targetDateStr)

    for (const invoice of invoices ?? []) {
      // Skip if this stage was already sent
      const { data: existing } = await supabase
        .from('reminders')
        .select('id')
        .eq('invoice_id', invoice.id)
        .eq('stage', stageConfig.stage)
        .maybeSingle()

      if (existing) continue

      await supabase.from('reminders').insert({
        invoice_id: invoice.id,
        stage: stageConfig.stage,
        scheduled_at: now.toISOString(),
        channel: stageConfig.channels.join(','),
        status: 'queued',
      })

      await qstash.publishJSON({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/deliver`,
        body: {
          invoice_id: invoice.id,
          stage: stageConfig.stage,
          channels: stageConfig.channels,
          invoice,
        },
      })

      queued.push(invoice.id)
    }
  }

  return NextResponse.json({ queued: queued.length, invoice_ids: queued })
}
