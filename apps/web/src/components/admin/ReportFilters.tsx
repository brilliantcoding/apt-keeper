'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, Suspense } from 'react'
import { SlidersHorizontal, RotateCcw } from 'lucide-react'

const PERIODS = [
  { value: '1m',  label: 'This month' },
  { value: '3m',  label: 'Last 3 months' },
  { value: '6m',  label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all', label: 'All time' },
]

interface Props {
  properties: { id: string; name: string }[]
  units: { id: string; unit_number: string; property_id: string }[]
  tenants: { id: string; name: string; email: string }[]
}

export function ReportFilters(props: Props) {
  return (
    <Suspense fallback={<div className="h-20 bg-white dark:bg-slate-900 rounded-xl border animate-pulse" />}>
      <ReportFiltersInner {...props} />
    </Suspense>
  )
}

function ReportFiltersInner({ properties, units, tenants }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const get = (k: string) => params.get(k) ?? ''

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString())
      if (value) next.set(key, value)
      else next.delete(key)
      // reset dependent filters
      if (key === 'property_id') { next.delete('unit_id') }
      router.push(`${pathname}?${next.toString()}`)
    },
    [params, pathname, router]
  )

  const reset = () => router.push(pathname)

  const selectedProperty = get('property_id')
  const filteredUnits = selectedProperty
    ? units.filter((u) => u.property_id === selectedProperty)
    : units

  const hasFilters = params.toString() !== ''

  const selectClass =
    'px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border p-4">
      <div className="flex items-center gap-2 mb-3">
        <SlidersHorizontal className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filters</span>
        {hasFilters && (
          <button
            onClick={reset}
            className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Period */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Period</label>
          <select
            value={get('period') || '12m'}
            onChange={(e) => update('period', e.target.value)}
            className={selectClass}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Property */}
        {properties.length > 1 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Property</label>
            <select
              value={get('property_id')}
              onChange={(e) => update('property_id', e.target.value)}
              className={selectClass}
            >
              <option value="">All properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Unit */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Unit</label>
          <select
            value={get('unit_id')}
            onChange={(e) => update('unit_id', e.target.value)}
            className={selectClass}
          >
            <option value="">All units</option>
            {filteredUnits.map((u) => (
              <option key={u.id} value={u.id}>Unit {u.unit_number}</option>
            ))}
          </select>
        </div>

        {/* Tenant */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Tenant</label>
          <select
            value={get('resident_id')}
            onChange={(e) => update('resident_id', e.target.value)}
            className={selectClass}
          >
            <option value="">All tenants</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name || t.email}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active filter pills */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {get('period') && get('period') !== '12m' && (
            <Pill label={`Period: ${PERIODS.find((p) => p.value === get('period'))?.label}`} onRemove={() => update('period', '')} />
          )}
          {get('property_id') && (
            <Pill label={`Property: ${properties.find((p) => p.id === get('property_id'))?.name}`} onRemove={() => update('property_id', '')} />
          )}
          {get('unit_id') && (
            <Pill label={`Unit ${units.find((u) => u.id === get('unit_id'))?.unit_number}`} onRemove={() => update('unit_id', '')} />
          )}
          {get('resident_id') && (
            <Pill
              label={`Tenant: ${tenants.find((t) => t.id === get('resident_id'))?.name || tenants.find((t) => t.id === get('resident_id'))?.email}`}
              onRemove={() => update('resident_id', '')}
            />
          )}
        </div>
      )}
    </div>
  )
}

function Pill({ label, onRemove }: { label: string | undefined; onRemove: () => void }) {
  if (!label) return null
  return (
    <span className="flex items-center gap-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-green-900 dark:hover:text-green-200 ml-0.5">✕</button>
    </span>
  )
}
