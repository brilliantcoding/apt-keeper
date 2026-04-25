import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { NewRequestButton } from '@/components/maintenance/NewRequestButton'

export default async function ResidentMaintenancePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: requests } = await supabase
    .from('maintenance_requests')
    .select('*, maintenance_photos(storage_path), maintenance_comments(count)')
    .eq('resident_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Maintenance Requests</h1>
          <p className="text-slate-500 mt-1">Track and submit maintenance issues</p>
        </div>
        <NewRequestButton />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {(requests ?? []).map((req) => (
          <RequestCard key={req.id} request={req} />
        ))}
        {!requests?.length && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border p-12 text-center text-slate-400">
            No maintenance requests yet. Submit one above.
          </div>
        )}
      </div>
    </div>
  )
}

function RequestCard({ request }: { request: any }) {
  const priorityColors: Record<string, string> = {
    P1: 'border-l-red-500',
    P2: 'border-l-orange-500',
    P3: 'border-l-amber-500',
    P4: 'border-l-blue-500',
  }

  const statusColors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    closed: 'bg-slate-100 text-slate-600',
  }

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl border border-l-4 ${priorityColors[request.priority] ?? 'border-l-slate-300'} p-5`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-slate-400">{request.priority}</span>
            <h3 className="font-semibold text-slate-900 dark:text-white">{request.title}</h3>
          </div>
          <p className="text-sm text-slate-500 line-clamp-2">{request.description}</p>
          <p className="text-xs text-slate-400 mt-2">Submitted {formatDate(request.created_at)}</p>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize whitespace-nowrap ${statusColors[request.status] ?? 'bg-slate-100 text-slate-600'}`}
        >
          {request.status.replace('_', ' ')}
        </span>
      </div>
    </div>
  )
}
