import twilio from 'twilio'

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
const FROM = process.env.TWILIO_PHONE_NUMBER!

export async function sendSms(to: string, body: string) {
  return client.messages.create({ from: FROM, to, body })
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
