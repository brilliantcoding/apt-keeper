import { Resend } from 'resend'

const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@aptkeeper.app'

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return
  const resend = new Resend(process.env.RESEND_API_KEY)
  return resend.emails.send({ from: FROM, to, subject, html })
}

export function buildPaymentConfirmationEmail(params: {
  residentName: string
  unitNumber: string
  amountPaid: number
  billDescription: string
  paidAt: string
  paymentLabel: string
}) {
  const { residentName, unitNumber, amountPaid, billDescription, paidAt, paymentLabel } = params
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountPaid / 100)
  const date = new Date(paidAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  return {
    subject: `[AptKeeper] Payment Confirmed — ${billDescription} ${amount}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#16a34a">AptKeeper</h2>
        <p>Hi ${residentName},</p>
        <p>Your payment has been received. Here are the details:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Bill</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600">${billDescription}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Unit</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${unitNumber}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Amount Paid</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#16a34a">${amount}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Payment Method</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${paymentLabel}</td></tr>
          <tr><td style="padding:8px;color:#64748b">Date</td><td style="padding:8px">${date}</td></tr>
        </table>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments"
           style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;border-radius:6px;text-decoration:none">
          View Payment History
        </a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">AptKeeper — Apartment Management Platform</p>
      </div>`,
  }
}

export function buildInvoiceGeneratedEmail(params: {
  residentName: string
  unitNumber: string
  amountDue: number
  billDescription: string
  dueDate: string
}) {
  const { residentName, unitNumber, amountDue, billDescription, dueDate } = params
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountDue / 100)
  return {
    subject: `[AptKeeper] New Invoice — ${billDescription} ${amount} due ${dueDate}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#16a34a">AptKeeper</h2>
        <p>Hi ${residentName},</p>
        <p>A new invoice has been generated for your unit <strong>${unitNumber}</strong>:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Bill</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600">${billDescription}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Amount Due</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600">${amount}</td></tr>
          <tr><td style="padding:8px;color:#64748b">Due Date</td><td style="padding:8px">${dueDate}</td></tr>
        </table>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bills"
           style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;border-radius:6px;text-decoration:none">
          View &amp; Pay
        </a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">AptKeeper — Apartment Management Platform</p>
      </div>`,
  }
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
