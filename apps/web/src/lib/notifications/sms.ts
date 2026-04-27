import twilio from 'twilio'

export async function sendSms(to: string, body: string) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  return client.messages.create({ from: process.env.TWILIO_PHONE_NUMBER!, to, body })
}

export function buildReminderSms(params: {
  residentName: string
  amountDue: number
  dueDate: string
  billDescription: string
  stage: number
  appUrl: string
}) {
  const { residentName, amountDue, dueDate, billDescription, stage, appUrl } = params
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    amountDue / 100
  )
  const urgency = stage > 5 ? 'FINAL NOTICE: ' : stage > 3 ? 'OVERDUE: ' : ''
  return `${urgency}Hi ${residentName}, your ${billDescription} bill of ${amount} is due ${dueDate}. Pay: ${appUrl}/dashboard/bills`
}
