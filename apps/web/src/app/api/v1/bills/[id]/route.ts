import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdateBillSchema = z.object({
  amount: z.number().int().positive().optional(),
  billing_period_start: z.string().optional(),
  billing_period_end: z.string().optional(),
  due_date: z.string().optional(),
  split_method: z.string().optional(),
  bill_type_id: z.string().uuid().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = UpdateBillSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()

  const { split_method, ...billFields } = parsed.data

  // Update split rule method if provided
  if (split_method) {
    const { data: bill } = await (admin as any)
      .from('bills')
      .select('split_rule_id')
      .eq('id', id)
      .single()

    if (bill?.split_rule_id) {
      await (admin as any)
        .from('split_rules')
        .update({ method: split_method })
        .eq('id', bill.split_rule_id)
    }
  }

  const { data, error } = await (admin as any)
    .from('bills')
    .update(billFields)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
