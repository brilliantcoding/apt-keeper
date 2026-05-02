import { createClient, createAdminClient } from "@/lib/supabase/server"
import { formatDate, formatCurrency } from '@/lib/utils'
import { Users } from 'lucide-react'
import { AssignLeaseModal } from '@/components/admin/AssignLeaseModal'

export default async function AdminResidentsPage() {
  const authClient = await createClient()
  const supabase = createAdminClient()
  const { data: { user } } = await authClient.auth.getUser()

  const [{ data: residents }, { data: allUnits }, { data: allLeases }] = await Promise.all([
    (supabase as any)
      .from('users')
      .select('id, email, full_name, phone, role')
      .eq('role', 'resident')
      .order('full_name', { ascending: true }),
    (supabase as any)
      .from('units')
      .select('id, unit_number, properties(name, manager_id)'),
    (supabase as any)
      .from('leases')
      .select(`
        id, resident_id, unit_id, status, monthly_rent, start_date, end_date,
        units(unit_number, properties(name))
      `),
  ])

  // Invoice totals per lease
  const { data: invoices } = await (supabase as any)
    .from('invoices')
    .select('lease_id, status, amount_due, amount_paid')

  const invoicesByLease = ((invoices ?? []) as any[]).reduce((acc: Record<string, any[]>, inv: any) => {
    if (!acc[inv.lease_id]) acc[inv.lease_id] = []
    acc[inv.lease_id].push(inv)
    return acc
  }, {})

  // Attach active lease to each resident
  const residentsWithLease = (residents ?? []).map((r: any) => {
    const activeLease = ((allLeases ?? []) as any[]).find(
      (l: any) => l.resident_id === r.id && l.status === 'active'
    )
    return { ...r, activeLease: activeLease ?? null }
  })

  // Vacant units (belonging to this manager, no active lease)
  const activeUnitIds = new Set(
    ((allLeases ?? []) as any[])
      .filter((l: any) => l.status === 'active')
      .map((l: any) => l.unit_id)
  )

  const vacantUnits = ((allUnits ?? []) as any[])
    .filter((u: any) => (u.properties as any)?.manager_id === user!.id && !activeUnitIds.has(u.id))
    .map((u: any) => ({
      id: u.id,
      unit_number: u.unit_number,
      property_name: (u.properties as any)?.name ?? '',
    }))

  // Residents with no active lease
  const unassignedResidents = residentsWithLease
    .filter((r: any) => !r.activeLease)
    .map((r: any) => ({ id: r.id, full_name: r.full_name, email: r.email ?? '' }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6" />
            Residents
          </h1>
          <p className="text-slate-500 mt-1">{residents?.length ?? 0} residents</p>
        </div>
        <AssignLeaseModal vacantUnits={vacantUnits} unassignedResidents={unassignedResidents} />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 text-left">
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Resident</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Unit</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Rent / mo</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Lease</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Outstanding</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {residentsWithLease.map((resident: any) => {
              const lease = resident.activeLease
              const unit = lease ? (lease.units as any) : null
              const leaseInvoices = lease ? (invoicesByLease[lease.id] ?? []) : []
              const outstanding = leaseInvoices
                .filter((i: any) => i.status !== 'paid')
                .reduce((s: number, i: any) => s + (i.amount_due - i.amount_paid), 0)

              return (
                <tr key={resident.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {resident.full_name || '(no name)'}
                    </p>
                    <p className="text-xs text-slate-400">{resident.email}</p>
                    {resident.phone && <p className="text-xs text-slate-400">{resident.phone}</p>}
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                    {unit ? (
                      <>
                        <p>Unit {unit.unit_number}</p>
                        <p className="text-xs text-slate-400">{unit.properties?.name}</p>
                      </>
                    ) : (
                      <span className="text-slate-400 italic">No unit</span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                    {lease ? formatCurrency(lease.monthly_rent) : '—'}
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs">
                    {lease ? (
                      <>
                        <p>{formatDate(lease.start_date)}</p>
                        <p>{lease.end_date ? `→ ${formatDate(lease.end_date)}` : 'Month-to-month'}</p>
                      </>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-4">
                    {outstanding > 0 ? (
                      <span className="font-semibold text-red-600">{formatCurrency(outstanding)}</span>
                    ) : (
                      <span className="text-green-600 font-semibold">Paid up</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        lease ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {lease ? 'Active' : 'No lease'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!residents?.length && (
          <div className="py-16 text-center text-slate-400">No residents yet.</div>
        )}
      </div>
    </div>
  )
}
