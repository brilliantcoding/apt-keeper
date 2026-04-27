import { NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { InvoicePDF } from '@/lib/pdf/InvoicePDF'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: invoice, error } = await (admin as any)
    .from('invoices')
    .select(`
      id, amount_due, amount_paid, status, due_date, created_at, lease_id,
      bills(billing_period_start, billing_period_end, bill_types(name, category)),
      units(unit_number, properties(name, address, manager_id))
    `)
    .eq('id', id)
    .single()

  if (error || !invoice) return Response.json({ error: 'Not found' }, { status: 404 })

  const { data: lease } = await (admin as any)
    .from('leases')
    .select('resident_id')
    .eq('id', invoice.lease_id)
    .single()

  const { data: userRow } = await (admin as any)
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = ['manager', 'super_admin', 'staff'].includes(userRow?.role)
  if (!isAdmin && lease?.resident_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: residentRow } = lease?.resident_id
    ? await (admin as any).from('users').select('full_name, email').eq('id', lease.resident_id).single()
    : { data: null }

  const property = invoice.units?.properties as any
  let propertyManager = 'Property Manager'
  if (property?.manager_id) {
    const { data: mgr } = await (admin as any)
      .from('users').select('full_name, email').eq('id', property.manager_id).single()
    if (mgr) propertyManager = mgr.full_name || mgr.email || propertyManager
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(InvoicePDF as any, {
    invoice,
    bill: invoice.bills,
    unit: invoice.units,
    resident: residentRow ?? null,
    propertyManager,
  }) as any)

  const invoiceNum = id.slice(0, 8).toUpperCase()
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${invoiceNum}.pdf"`,
    },
  })
}
