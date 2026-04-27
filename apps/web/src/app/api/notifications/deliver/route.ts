import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail, buildReminderEmail } from '@/lib/notifications/email'
import { sendSms, buildReminderSms } from '@/lib/notifications/sms'
import { sendPushNotification } from '@/lib/notifications/fcm'
import { formatDate } from '@/lib/utils'

async function handler(req: NextRequest) {
  const body = await req.json()
  const { invoice_id, stage, channels, invoice } = body

  const supabase = createAdminClient()
  const resident = (invoice.leases as any)?.users
  if (!resident) return NextResponse.json({ error: 'No resident found' }, { status: 400 })

  const billName = (invoice.bills as any)?.bill_types?.name ?? 'Bill'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  const errors: string[] = []

  if (channels.includes('email') && resident.email) {
    const { subject, html } = buildReminderEmail({
      residentName: resident.full_name,
      unitNumber: '',
      amountDue: invoice.amount_due - invoice.amount_paid,
      dueDate: formatDate(invoice.due_date),
      billDescription: billName,
      stage,
    })
    try {
      await sendEmail(resident.email, subject, html)
    } catch (e: any) {
      errors.push(`email: ${e.message}`)
    }
  }

  if (channels.includes('sms') && resident.phone) {
    const smsBody = buildReminderSms({
      residentName: resident.full_name,
      amountDue: invoice.amount_due - invoice.amount_paid,
      dueDate: formatDate(invoice.due_date),
      billDescription: billName,
      stage,
      appUrl,
    })
    try {
      await sendSms(resident.phone, smsBody)
    } catch (e: any) {
      errors.push(`sms: ${e.message}`)
    }
  }

  if (channels.includes('push') && resident.fcm_token) {
    const title = stage > 3 ? 'Overdue Bill Reminder' : 'Bill Payment Reminder'
    const body = `Your ${billName} bill is ${stage > 3 ? 'overdue' : 'due soon'}.`
    try {
      await sendPushNotification(resident.fcm_token, title, body, { invoice_id })
    } catch (e: any) {
      errors.push(`push: ${e.message}`)
    }
  }

  await supabase
    .from('reminders')
    .update({ sent_at: new Date().toISOString(), status: errors.length ? 'partial' : 'sent' })
    .eq('invoice_id', invoice_id)
    .eq('stage', stage)

  return NextResponse.json({ delivered: true, errors })
}

export async function POST(req: NextRequest) {
  if (process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY) {
    const { verifySignatureAppRouter } = await import('@upstash/qstash/nextjs')
    return verifySignatureAppRouter(handler as Parameters<typeof verifySignatureAppRouter>[0])(req)
  }
  return handler(req)
}
