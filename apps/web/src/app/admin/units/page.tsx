import { createClient, createAdminClient } from "@/lib/supabase/server"
import { formatDate } from '@/lib/utils'
import { Building2 } from 'lucide-react'
import { AddUnitModal } from '@/components/admin/AddUnitModal'
import { EditUnitModal } from '@/components/admin/EditUnitModal'

export default async function AdminUnitsPage() {
  const authClient = await createClient()
  const supabase = createAdminClient()
  const { data: { user } } = await authClient.auth.getUser()

  const [{ data: units }, { data: properties }, { data: leases }, { data: residentUsers }] =
    await Promise.all([
      (supabase as any)
        .from('units')
        .select('*, properties(name, address)')
        .order('unit_number', { ascending: true }),
      (supabase as any)
        .from('properties')
        .select('id, name')
        .eq('manager_id', user!.id),
      (supabase as any)
        .from('leases')
        .select('id, unit_id, resident_id, status, monthly_rent, start_date, end_date')
        .eq('status', 'active'),
      (supabase as any)
        .from('users')
        .select('id, full_name, email, phone')
        .eq('role', 'resident'),
    ])

  const residentMap = Object.fromEntries(
    ((residentUsers ?? []) as any[]).map((r: any) => [r.id, r])
  )

  const leaseByUnit = Object.fromEntries(
    ((leases ?? []) as any[]).map((l: any) => [l.unit_id, l])
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Units
          </h1>
          <p className="text-slate-500 mt-1">{units?.length ?? 0} units across all properties</p>
        </div>
        <AddUnitModal properties={properties ?? []} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {((units ?? []) as any[]).map((unit: any) => {
          const activeLease = leaseByUnit[unit.id] ?? null
          const resident = activeLease ? residentMap[activeLease.resident_id] : null
          const isOccupied = !!activeLease

          return (
            <div key={unit.id} className="bg-white dark:bg-slate-900 rounded-xl border p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    Unit {unit.unit_number}
                  </h3>
                  <p className="text-sm text-slate-500">{unit.properties?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      isOccupied ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isOccupied ? 'Occupied' : 'Vacant'}
                  </span>
                  <EditUnitModal unit={unit} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg py-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{unit.bedrooms}</p>
                  <p className="text-xs text-slate-500">Bed</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg py-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{unit.bathrooms}</p>
                  <p className="text-xs text-slate-500">Bath</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg py-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {unit.sq_ft ? `${unit.sq_ft}` : '—'}
                  </p>
                  <p className="text-xs text-slate-500">Sq ft</p>
                </div>
              </div>

              {isOccupied && resident ? (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {resident.full_name || resident.email}
                  </p>
                  <p className="text-xs text-slate-500">{resident.email}</p>
                  {resident.phone && <p className="text-xs text-slate-500">{resident.phone}</p>}
                  <p className="text-xs text-slate-400 mt-2">
                    Lease until{' '}
                    {activeLease.end_date ? formatDate(activeLease.end_date) : 'Month-to-month'}
                  </p>
                </div>
              ) : (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <p className="text-sm text-slate-400 italic">No active tenant</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!units?.length && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border p-16 text-center text-slate-400">
          No units found. Add a property and units first.
        </div>
      )}
    </div>
  )
}
