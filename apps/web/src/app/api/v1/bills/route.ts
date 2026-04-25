import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateBillSchema = z.object({
  property_id: z.string().uuid(),
  bill_type_id: z.string().uuid(),
  amount: z.number().int().positive(),
  billing_period_start: z.string(),
  billing_period_end: z.string(),
  due_date: z.string(),
  split_rule_id: z.string().uuid().optional(),
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const propertyId = searchParams.get('property_id')

  let query = supabase
    .from('bills')
    .select('*, bill_types(name, category), split_rules(method)')
    .order('due_date', { ascending: false })

  if (propertyId) query = query.eq('property_id', propertyId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = CreateBillSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = await createAdminClient()
  const { data, error } = await admin
    .from('bills')
    .insert({ ...parsed.data, status: 'active' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
