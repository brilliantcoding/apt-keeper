import { createClient, createAdminClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { NewRequestButton } from '@/components/maintenance/NewRequestButton'
import { MaintenanceRequestCard } from '@/components/maintenance/MaintenanceRequestCard'

export default async function ResidentMaintenancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()

  const { data: requests } = await (admin as any)
    .from('maintenance_requests')
    .select('id, title, description, priority, status, created_at, unit_id, sla_deadline')
    .eq('resident_id', user!.id)
    .order('created_at', { ascending: false })

  // Fetch comments for all requests
  const requestIds = (requests ?? []).map((r: any) => r.id)
  const { data: comments } = requestIds.length
    ? await (admin as any)
        .from('maintenance_comments')
        .select('id, request_id, body, created_at, author_id, users(full_name, email, role)')
        .in('request_id', requestIds)
        .order('created_at', { ascending: true })
    : { data: [] }

  const commentsByRequest = ((comments ?? []) as any[]).reduce((acc: any, c: any) => {
    if (!acc[c.request_id]) acc[c.request_id] = []
    acc[c.request_id].push(c)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Maintenance Requests</h1>
          <p className="text-slate-500 mt-1">Track and submit maintenance issues</p>
        </div>
        <NewRequestButton />
      </div>

      <div className="space-y-4">
        {((requests ?? []) as any[]).map((req: any) => (
          <MaintenanceRequestCard
            key={req.id}
            request={req}
            comments={commentsByRequest[req.id] ?? []}
            userId={user!.id}
          />
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
