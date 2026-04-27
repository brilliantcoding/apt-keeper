import { createClient, createAdminClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { BarChart3, Users, Building2, TrendingUp, AlertCircle } from 'lucide-react'
import { ReportFilters } from '@/components/admin/ReportFilters'

function monthKey(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const [year, month] = key.split('-')
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-US', {
    month: 'short', year: 'numeric',
  })
}

function periodToRange(period: string): { from: Date; to: Date } {
  const now = new Date()
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) // end of current month
  switch (period) {
    case '1m': return { from: new Date(now.getFullYear(), now.getMonth(), 1), to }
    case '3m': return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to }
    case '6m': return { from: new Date(now.getFullYear(), now.getMonth() - 5, 1), to }
    case 'ytd': return { from: new Date(now.getFullYear(), 0, 1), to }
    case 'all': return { from: new Date('2000-01-01'), to }
    default:   return { from: new Date(now.getFullYear(), now.getMonth() - 11, 1), to } // 12m
  }
}

type SearchParams = { period?: string; property_id?: string; unit_id?: string; resident_id?: string }

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const period      = sp.period      ?? '12m'
  const propertyId  = sp.property_id ?? ''
  const unitId      = sp.unit_id     ?? ''
  const residentId  = sp.resident_id ?? ''

  const { from, to } = periodToRange(period)

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  const supabase = createAdminClient()

  // ── Base data ──────────────────────────────────────────────────────────────
  const [
    { data: properties },
    { data: allUnits },
    { data: activeLeases },
    { data: residents },
    { data: rawInvoices },
  ] = await Promise.all([
    (supabase as any).from('properties').select('id, name').eq('manager_id', user!.id),
    (supabase as any).from('units').select('id, unit_number, property_id'),
    (supabase as any).from('leases').select('id, unit_id, resident_id, monthly_rent, start_date').eq('status', 'active'),
    (supabase as any).from('users').select('id, full_name, email').eq('role', 'resident'),
    (supabase as any)
      .from('invoices')
      .select('id, amount_due, amount_paid, status, due_date, unit_id, lease_id')
      .gte('due_date', from.toISOString())
      .lte('due_date', to.toISOString())
      .order('due_date', { ascending: true }),
  ])

  // ── Scope to manager's properties ─────────────────────────────────────────
  const myPropertyIds = new Set(((properties ?? []) as any[]).map((p: any) => p.id))
  const myUnits = ((allUnits ?? []) as any[]).filter((u: any) => myPropertyIds.has(u.property_id))
  const myUnitIds = new Set(myUnits.map((u: any) => u.id))
  const myActiveLeases = ((activeLeases ?? []) as any[]).filter((l: any) => myUnitIds.has(l.unit_id))
  const residentMap = Object.fromEntries(((residents ?? []) as any[]).map((r: any) => [r.id, r]))
  const unitMap = Object.fromEntries(myUnits.map((u: any) => [u.id, u]))

  // ── Apply filters ──────────────────────────────────────────────────────────
  // property filter → restrict allowed unit ids
  const filteredUnitIds = propertyId
    ? new Set(myUnits.filter((u: any) => u.property_id === propertyId).map((u: any) => u.id))
    : myUnitIds

  // resident filter → restrict allowed unit ids via active leases
  const filteredLeaseUnitIds = residentId
    ? new Set(myActiveLeases.filter((l: any) => l.resident_id === residentId).map((l: any) => l.unit_id))
    : null

  const allowedUnitIds = new Set(
    [...filteredUnitIds].filter((id) => {
      if (unitId && id !== unitId) return false
      if (filteredLeaseUnitIds && !filteredLeaseUnitIds.has(id)) return false
      return true
    })
  )

  const invoices = ((rawInvoices ?? []) as any[]).filter((i: any) => allowedUnitIds.has(i.unit_id))

  const filteredLeases = unitId
    ? myActiveLeases.filter((l: any) => l.unit_id === unitId)
    : residentId
    ? myActiveLeases.filter((l: any) => l.resident_id === residentId)
    : myActiveLeases.filter((l: any) => allowedUnitIds.has(l.unit_id))

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalUnits = propertyId
    ? myUnits.filter((u: any) => u.property_id === propertyId).length
    : myUnits.length
  const occupiedUnits = filteredLeases.length
  const vacantUnits = totalUnits - occupiedUnits
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
  const monthlyRentRoll = filteredLeases.reduce((s: number, l: any) => s + (l.monthly_rent ?? 0), 0)

  const totalBilled    = invoices.reduce((s: number, i: any) => s + i.amount_due, 0)
  const totalCollected = invoices.reduce((s: number, i: any) => s + i.amount_paid, 0)
  const totalPending   = invoices.filter((i: any) => i.status === 'pending').reduce((s: number, i: any) => s + (i.amount_due - i.amount_paid), 0)
  const totalOverdue   = invoices.filter((i: any) => i.status === 'overdue').reduce((s: number, i: any) => s + (i.amount_due - i.amount_paid), 0)
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0

  // ── Cash flow months ───────────────────────────────────────────────────────
  const monthSet = new Set(invoices.map((i: any) => monthKey(i.due_date)))
  const sortedMonths = [...monthSet].sort()
  if (sortedMonths.length === 0) {
    // fill period months even if no invoices
    const cur = new Date(from)
    while (cur <= to) {
      sortedMonths.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`)
      cur.setMonth(cur.getMonth() + 1)
    }
  }

  type MonthData = { billed: number; collected: number; pending: number; overdue: number; count: number }
  const cashFlow: Record<string, MonthData> = {}
  sortedMonths.forEach((m) => { cashFlow[m] = { billed: 0, collected: 0, pending: 0, overdue: 0, count: 0 } })
  for (const inv of invoices) {
    const mk = monthKey(inv.due_date)
    if (!cashFlow[mk]) continue
    cashFlow[mk].billed    += inv.amount_due
    cashFlow[mk].collected += inv.amount_paid
    cashFlow[mk].count     += 1
    const rem = inv.amount_due - inv.amount_paid
    if (inv.status === 'pending') cashFlow[mk].pending += rem
    if (inv.status === 'overdue') cashFlow[mk].overdue += rem
  }

  // ── Annual summary ─────────────────────────────────────────────────────────
  type YearData = { billed: number; collected: number; pending: number; overdue: number; count: number }
  const annualMap: Record<string, YearData> = {}
  for (const inv of invoices) {
    const yr = new Date(inv.due_date).getFullYear().toString()
    if (!annualMap[yr]) annualMap[yr] = { billed: 0, collected: 0, pending: 0, overdue: 0, count: 0 }
    annualMap[yr].billed    += inv.amount_due
    annualMap[yr].collected += inv.amount_paid
    annualMap[yr].count     += 1
    const rem = inv.amount_due - inv.amount_paid
    if (inv.status === 'pending') annualMap[yr].pending += rem
    if (inv.status === 'overdue') annualMap[yr].overdue += rem
  }
  const annualYears = Object.keys(annualMap).sort((a, b) => Number(b) - Number(a))

  // ── Tenant list ────────────────────────────────────────────────────────────
  const tenantRows = filteredLeases.map((l: any) => {
    const resident = residentMap[l.resident_id]
    const unit = unitMap[l.unit_id]
    const leaseInvoices = invoices.filter((i: any) => i.lease_id === l.id)
    return {
      id: l.id,
      name: resident?.full_name || resident?.email || 'Unknown',
      email: resident?.email ?? '',
      unit: unit ? `Unit ${unit.unit_number}` : '—',
      monthlyRent: l.monthly_rent ?? 0,
      since: l.start_date,
      billed: leaseInvoices.reduce((s: number, i: any) => s + i.amount_due, 0),
      collected: leaseInvoices.reduce((s: number, i: any) => s + i.amount_paid, 0),
      outstanding: leaseInvoices
        .filter((i: any) => i.status !== 'paid')
        .reduce((s: number, i: any) => s + (i.amount_due - i.amount_paid), 0),
    }
  })

  // Data for filter dropdowns
  const tenantOptions = myActiveLeases.map((l: any) => {
    const r = residentMap[l.resident_id]
    return { id: l.resident_id, name: r?.full_name || '', email: r?.email || '' }
  }).filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i) // dedupe

  const now = new Date()

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Reports
        </h1>
        <p className="text-slate-500 mt-1">Filter by property, unit, tenant, or time period</p>
      </div>

      {/* Filters */}
      <ReportFilters
        properties={(properties ?? []) as any[]}
        units={myUnits}
        tenants={tenantOptions}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Active Tenants"    value={String(occupiedUnits)}           sub={`${vacantUnits} vacant of ${totalUnits}`}             icon={<Users className="w-4 h-4 text-green-600" />}    color="green" />
        <KpiCard label="Occupancy Rate"    value={`${occupancyRate}%`}             sub={`${occupiedUnits} occupied`}                          icon={<Building2 className="w-4 h-4 text-blue-600" />} color="blue" />
        <KpiCard label="Monthly Rent Roll" value={formatCurrency(monthlyRentRoll)} sub={`${formatCurrency(monthlyRentRoll * 12)} / year`}     icon={<TrendingUp className="w-4 h-4 text-purple-600" />} color="purple" />
        <KpiCard label="Outstanding"       value={formatCurrency(totalPending + totalOverdue)} sub={`${formatCurrency(totalOverdue)} overdue`} icon={<AlertCircle className="w-4 h-4 text-red-500" />} color="red" />
      </div>

      {/* Billing summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Total Billed"    value={formatCurrency(totalBilled)}    color="slate" />
        <SummaryCard label="Collected"       value={formatCurrency(totalCollected)} color="green" />
        <SummaryCard label="Pending"         value={formatCurrency(totalPending)}   color="amber" />
        <SummaryCard label="Overdue"         value={formatCurrency(totalOverdue)}   color="red" />
      </div>

      {/* Cash flow table */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Cash Flow</h2>
        <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-left">
                <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Month</th>
                <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Invoices</th>
                <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Billed</th>
                <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Collected</th>
                <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Pending</th>
                <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Overdue</th>
                <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400 w-36">Collection %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedMonths.map((mk) => {
                const m = cashFlow[mk]
                const rate = m.billed > 0 ? Math.round((m.collected / m.billed) * 100) : 0
                const isCurrent = mk === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                return (
                  <tr key={mk} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isCurrent ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                      {monthLabel(mk)}
                      {isCurrent && <span className="ml-2 text-xs text-green-600 font-semibold">current</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{m.count || '—'}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">
                      {m.billed > 0 ? formatCurrency(m.billed) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-green-600 font-semibold">
                      {m.collected > 0 ? formatCurrency(m.collected) : <span className="text-slate-300 font-normal">—</span>}
                    </td>
                    <td className="px-5 py-3 text-amber-600">
                      {m.pending > 0 ? formatCurrency(m.pending) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-red-600">
                      {m.overdue > 0 ? formatCurrency(m.overdue) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {m.billed > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full">
                            <div className={`h-1.5 rounded-full ${rate >= 90 ? 'bg-green-500' : rate >= 60 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 w-8 text-right">{rate}%</span>
                        </div>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {totalBilled > 0 && (
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700 font-semibold">
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-300">Total</td>
                  <td className="px-5 py-3 text-slate-500">{invoices.length}</td>
                  <td className="px-5 py-3 text-slate-900 dark:text-white">{formatCurrency(totalBilled)}</td>
                  <td className="px-5 py-3 text-green-600">{formatCurrency(totalCollected)}</td>
                  <td className="px-5 py-3 text-amber-600">{totalPending > 0 ? formatCurrency(totalPending) : '—'}</td>
                  <td className="px-5 py-3 text-red-600">{totalOverdue > 0 ? formatCurrency(totalOverdue) : '—'}</td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{collectionRate}% overall</td>
                </tr>
              </tfoot>
            )}
          </table>
          {invoices.length === 0 && (
            <div className="py-12 text-center text-slate-400">No invoices found for this filter.</div>
          )}
        </div>
      </section>

      {/* Annual summary */}
      {annualYears.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Annual Summary</h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Year</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Invoices</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Billed</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Collected</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Pending</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Overdue</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Collection %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {annualYears.map((yr) => {
                  const y = annualMap[yr]
                  const rate = y.billed > 0 ? Math.round((y.collected / y.billed) * 100) : 0
                  return (
                    <tr key={yr} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">{yr}</td>
                      <td className="px-5 py-3 text-slate-500">{y.count}</td>
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{formatCurrency(y.billed)}</td>
                      <td className="px-5 py-3 text-green-600 font-semibold">{formatCurrency(y.collected)}</td>
                      <td className="px-5 py-3 text-amber-600">{y.pending > 0 ? formatCurrency(y.pending) : '—'}</td>
                      <td className="px-5 py-3 text-red-600">{y.overdue > 0 ? formatCurrency(y.overdue) : '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full">
                            <div className={`h-1.5 rounded-full ${rate >= 90 ? 'bg-green-500' : rate >= 60 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 w-8 text-right">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tenant breakdown */}
      {tenantRows.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Tenant Breakdown ({tenantRows.length})
          </h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-left">
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Tenant</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Unit</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Monthly Rent</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Billed</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Collected</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Outstanding</th>
                  <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-400">Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tenantRows.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.email}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{t.unit}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{formatCurrency(t.monthlyRent)}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{t.billed > 0 ? formatCurrency(t.billed) : '—'}</td>
                    <td className="px-5 py-3 text-green-600">{t.collected > 0 ? formatCurrency(t.collected) : '—'}</td>
                    <td className="px-5 py-3">
                      {t.outstanding > 0
                        ? <span className="text-red-600 font-semibold">{formatCurrency(t.outstanding)}</span>
                        : <span className="text-green-600 text-xs">All clear</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {t.since ? new Date(t.since).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700 font-semibold">
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-300" colSpan={2}>Total</td>
                  <td className="px-5 py-3 text-slate-900 dark:text-white">{formatCurrency(monthlyRentRoll)}/mo</td>
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{formatCurrency(totalBilled)}</td>
                  <td className="px-5 py-3 text-green-600">{formatCurrency(totalCollected)}</td>
                  <td className="px-5 py-3 text-red-600">{(totalPending + totalOverdue) > 0 ? formatCurrency(totalPending + totalOverdue) : '—'}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{formatCurrency(monthlyRentRoll * 12)}/yr</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function KpiCard({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: React.ReactNode; color: string }) {
  const bg: Record<string, string> = {
    green: 'bg-green-50 dark:bg-green-900/20',
    blue: 'bg-blue-50 dark:bg-blue-900/20',
    purple: 'bg-purple-50 dark:bg-purple-900/20',
    red: 'bg-red-50 dark:bg-red-900/20',
  }
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border p-5">
      <div className={`w-9 h-9 rounded-lg ${bg[color]} flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  const border: Record<string, string> = {
    green: 'border-l-green-500', amber: 'border-l-amber-500',
    red: 'border-l-red-500', slate: 'border-l-slate-400',
  }
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-l-4 ${border[color]} p-4`}>
      <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}
