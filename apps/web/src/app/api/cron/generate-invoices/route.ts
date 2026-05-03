import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { calculateSplit } from '@apt-keeper/db'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const generationBatchId = randomUUID()

  const now = new Date()
  const todayIso = now.toISOString()

  // due_date is read per-bill below — no hardcoded date
  const { data: activeBills } = await supabase
    .from('bills')
    .select('*, split_rules(*), properties(units(*, leases(*)))')
    .eq('status', 'active')
    .lte('billing_period_start', todayIso)

  if (!activeBills?.length) {
    return NextResponse.json({ message: 'No active bills', batch: generationBatchId })
  }

  const invoicesToInsert: any[] = []

  // Batch-fetch all existing invoices for active bills to avoid N+1 checks
  const activeBillIds = activeBills.map((b) => b.id)
  const { data: existingInvoices } = await supabase
    .from('invoices')
    .select('bill_id, unit_id')
    .in('bill_id', activeBillIds)

  const existingSet = new Set(
    (existingInvoices ?? []).map((i) => `${i.bill_id}:${i.unit_id}`)
  )

  for (const bill of activeBills) {
    const property = bill.properties as any
    const units: any[] = property?.units ?? []
    const activeUnits = units.filter((u) => u.leases?.some((l: any) => l.status === 'active'))

    const rawRule = bill.split_rules as any
    const splitRule = Array.isArray(rawRule) ? (rawRule[0] ?? null) : (rawRule ?? null)
    const splitAmounts = calculateSplit(bill.amount, activeUnits, splitRule)

    for (const unit of activeUnits) {
      const activeLease = unit.leases?.find((l: any) => l.status === 'active')
      if (!activeLease) continue
      if (existingSet.has(`${bill.id}:${unit.id}`)) continue

      const amount = splitAmounts[unit.id] ?? 0
      invoicesToInsert.push({
        unit_id: unit.id,
        lease_id: activeLease.id,
        bill_id: bill.id,
        amount_due: amount,
        amount_paid: 0,
        status: 'pending',
        due_date: (bill as any).due_date,
        generation_batch_id: generationBatchId,
      })
    }
  }

  if (invoicesToInsert.length > 0) {
    const { error } = await supabase.from('invoices').insert(invoicesToInsert)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    message: `Generated ${invoicesToInsert.length} invoices`,
    batch: generationBatchId,
  })
}
