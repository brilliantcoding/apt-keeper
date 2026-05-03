import { cookies } from 'next/headers'

export async function getCurrency(): Promise<string> {
  const store = await cookies()
  const val = store.get('apt_currency')?.value
  if (!val) return 'INR'
  return val === 'USD' ? 'USD' : 'INR'
}
