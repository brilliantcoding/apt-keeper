import { createAdminClient } from "@/lib/supabase/server"
import { formatDate } from '@/lib/utils'
import { Wrench } from 'lucide-react'
import { MaintenanceStatusUpdate } from '@/components/maintenance/MaintenanceStatusUpdate'
import { CreateMaintenanceRequestButton } from '@/components/admin/CreateMaintenanceRequestButton'

export default async function AdminMaintenancePage() {
  const supabase = createAdminClient()

  const [{ data: requests }, { data: activeLeases }] = await Promise.all([
    (supabase as any)
      .from('maintenance_requests')
      .select('id, title, description, priority, status, created_at, unit_id, resident_id')
      .order('created_at', { ascending: false }),
    (supabase as any)
      .from('leases')
      .select('unit_id, resident_id')
      .eq('status', 'active'),
  ])

  // Fetch units and residents separately
  const unitIds = [...new Set([
    ...((requests ?? []) as any[]).map((r: any) => r.unit_id),
    ...((activeLeases ?? []) as any[]).map((l: any) => l.unit_id),
  ])].filter(Boolean)

  const residentIds = [...new Set([
    ...((requests ?? []) as any[]).map((r: any) => r.resident_id),
    ...((activeLeases ?? []) as any[]).map((l: any) => l.resident_id),
  ])].filter(Boolean)

  const [{ data: units }, { data: residents }] = await Promise.all([
    unitIds.length
      ? (supabase as any).from('units').select('id, unit_number, properties(name)').in('id', unitIds)
      : { data: [] },
    residentIds.length
      ? (supabase as any).from('users').select('id, full_name, email').in('id', residentIds)
      : { data: [] },
  ])

  const unitMap = Object.fromEntries(((units ?? []) as any[]).map((u: any) => [u.id, u]))
  const residentMap = Object.fromEntries(((residents ?? []) as any[]).map((r: any) => [r.id, r]))

  const open = ((requests ?? []) as any[]).filter((r: any) => r.status === 'open').length
  const inProgress = ((requests ?? []) as any[]).filter((r: any) => r.status === 'in_progress').length

  // Units with active leases for the "New Request" button
  const occupiedUnits = ((activeLeases ?? []) as any[]).map((l: any) => {
    const unit = unitMap[l.unit_id]
    const resident = residentMap[l.resident_id]
    return {
      id: l.unit_id,
      unit_number: unit?.unit_number ?? '?',
      property_name: unit?.properties?.name ?? '',
      resident_id: l.resident_id,
      resident_name: resident?.full_name || resident?.email || 'Unknown',
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-6 h-6" />
            Maintenance
          </h1>
          <p className="text-slate-500 mt-1">{open} open · {inProgress} in progress</p>
        </div>
        <CreateMaintenanceRequestButton units={occupiedUnits} />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 text-left">
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Request</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Unit</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Resident</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Priority</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Submitted</th>
              <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {((requests ?? []) as any[]).map((req: any) => {
              const unit = unitMap[req.unit_id]
              const resident = residentMap[req.resident_id]
              return (
                <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-4 max-w-xs">
                    <p className="font-medium text-slate-900 dark:text-white">{req.title}</p>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{req.description}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                    <p>Unit {unit?.unit_number ?? '—'}</p>
                    <p className="text-xs text-slate-400">{unit?.properties?.name}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                    {resident?.full_name || resident?.email || '—'}
                  </td>
                  <td className="px-5 py-4">
                    <PriorityBadge priority={req.priority} />
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs">
                    {formatDate(req.created_at)}
                  </td>
                  <td className="px-5 py-4">
                    <MaintenanceStatusUpdate id={req.id} currentStatus={req.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!requests?.length && (
          <div className="py-16 text-center text-slate-400">No maintenance requests.</div>
        )}
      </div>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    P1: 'bg-red-100 text-red-700',
    P2: 'bg-orange-100 text-orange-700',
    P3: 'bg-amber-100 text-amber-700',
    P4: 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors[priority] ?? 'bg-slate-100 text-slate-600'}`}>
      {priority}
    </span>
  )
}
