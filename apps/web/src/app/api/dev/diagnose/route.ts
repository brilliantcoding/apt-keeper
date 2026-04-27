import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const admin = createAdminClient()

  const [
    { data: authUsers },
    { data: publicUsers },
    { data: properties },
    { data: units },
    { data: leases },
    { data: invoices },
    { data: bills },
    { data: splitRules },
  ] = await Promise.all([
    admin.auth.admin.listUsers(),
    (admin as any).from('users').select('id, email, role, full_name'),
    (admin as any).from('properties').select('id, name, manager_id'),
    (admin as any).from('units').select('id, unit_number, property_id'),
    (admin as any).from('leases').select('id, resident_id, unit_id, status, monthly_rent, start_date'),
    (admin as any).from('invoices').select('id, lease_id, status, amount_due'),
    (admin as any).from('bills').select('id, property_id, status, amount, billing_period_start, billing_period_end, due_date, bill_type_id'),
    (admin as any).from('split_rules').select('id, property_id, bill_type_id, method'),
  ])

  const publicUserIds = new Set((publicUsers ?? []).map((u: any) => u.id))
  const missingFromPublic = (authUsers?.users ?? []).filter(u => !publicUserIds.has(u.id))

  // Test the exact residents page join query
  const { data: residentsWithLeases, error: joinError } = await (admin as any)
    .from('users')
    .select(`
      id, email, full_name, role,
      leases(id, status, monthly_rent, start_date, end_date,
        units(unit_number, properties(name))
      )
    `)
    .eq('role', 'resident')

  return NextResponse.json({
    auth_users: (authUsers?.users ?? []).map(u => ({ id: u.id, email: u.email, created_at: u.created_at })),
    public_users: publicUsers,
    missing_from_public_users: missingFromPublic.map(u => ({ id: u.id, email: u.email })),
    properties,
    units,
    leases,
    invoices_count: (invoices ?? []).length,
    residents_with_leases: residentsWithLeases,
    join_error: joinError,
    bills,
    split_rules: splitRules,
    invoice_generation_check: {
      now: new Date().toISOString(),
      period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      active_bills: (bills ?? []).filter((b: any) => b.status === 'active'),
      active_bills_in_period: (bills ?? []).filter((b: any) =>
        b.status === 'active' &&
        new Date(b.billing_period_start) <= new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      ),
    },
  }, { status: 200 })
}
