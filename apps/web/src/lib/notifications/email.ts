import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@aptkeeper.app'

export async function sendEmail(to: string, subject: string, html: string) {
  return resend.emails.send({ from: FROM, to, subject, html })
}

export function buildReminderEmail(params: {
  residentName: string
  unitNumber: string
  amountDue: number
  dueDate: string
  billDescription: string
  stage: number
}) {
  const { residentName, unitNumber, amountDue, dueDate, billDescription, stage } = params
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    amountDue / 100
  )
  const stageLabel =
    stage <= 3 ? 'Payment Reminder' : stage <= 5 ? 'Overdue Notice' : 'Final Notice'

  return {
    subject: `[AptKeeper] ${stageLabel} — ${billDescription} ${amount} due`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#16a34a">AptKeeper</h2>
        <p>Hi ${residentName},</p>
        <p>This is a reminder that your <strong>${billDescription}</strong> bill of <strong>${amount}</strong>
        for unit <strong>${unitNumber}</strong> is due on <strong>${dueDate}</strong>.</p>
        ${stage > 3 ? `<p style="color:#dc2626"><strong>Your payment is overdue. Please pay immediately to avoid additional late fees.</strong></p>` : ''}
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bills"
           style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;border-radius:6px;text-decoration:none">
          Pay Now
        </a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">AptKeeper — Apartment Management Platform</p>
      </div>`,
  }
}
