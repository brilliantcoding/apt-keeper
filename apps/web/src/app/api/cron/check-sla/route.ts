import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const { data: breached } = await supabase
    .from('maintenance_requests')
    .select('id, title, priority, sla_deadline, units(unit_number, properties(manager_id))')
    .in('status', ['open', 'in_progress'])
    .lt('sla_deadline', now)

  for (const req of breached ?? []) {
    await supabase
      .from('audit_logs')
      .insert({
        action: 'sla_breached',
        entity_type: 'maintenance_request',
        entity_id: req.id,
        metadata: { priority: req.priority, sla_deadline: req.sla_deadline },
      })
  }

  return NextResponse.json({ breached: breached?.length ?? 0 })
}
