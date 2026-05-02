'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmail, buildInvoiceGeneratedEmail } from '@/lib/notifications/email'

export async function updateCurrency(currency: string) {
  if (currency !== 'USD' && currency !== 'INR') return { error: 'Invalid currency' }
  const store = await cookies()
  store.set('apt_currency', currency, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  revalidatePath('/', 'layout')
  return { error: null }
}

function revalidateAdminRoutes() {
  revalidatePath('/admin/settings')
  revalidatePath('/admin/units')
  revalidatePath('/admin/bills')
  revalidatePath('/admin/residents')
  revalidatePath('/admin/maintenance')
}

export async function updateMaintenanceStatus(id: string, status: string) {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('maintenance_requests')
    .update({ status })
    .eq('id', id)
  if (error) return { error: (error as any).message }
  revalidatePath('/admin/maintenance')
  return { error: null }
}

export async function updateProfile(userId: string, full_name: string, phone: string) {
  const supabase = createAdminClient()
  const { error } = await (supabase as any)
    .from('users')
    .update({ full_name, phone })
    .eq('id', userId)
  if (error) return { error: (error as any).message }
  revalidatePath('/admin/settings')
  return { error: null }
}

export async function updateProperty(id: string, name: string, address: string) {
  const supabase = createAdminClient()
  const { error } = await (supabase as any)
    .from('properties')
    .update({ name, address })
    .eq('id', id)
  if (error) return { error: (error as any).message }
  revalidatePath('/admin/settings')
  return { error: null }
}

export async function togglePropertyPayments(id: string, enabled: boolean) {
  const supabase = createAdminClient()
  const { error } = await (supabase as any)
    .from('properties')
    .update({ payments_enabled: enabled })
    .eq('id', id)
  if (error) return { error: (error as any).message }
  revalidatePath('/admin/settings')
  revalidatePath('/dashboard/bills')
  return { error: null }
}

export async function deleteProperty(id: string) {
  const supabase = createAdminClient()
  const { error } = await (supabase as any)
    .from('properties')
    .delete()
    .eq('id', id)
  if (error) return { error: (error as any).message }
  revalidateAdminRoutes()
  return { error: null }
}

export async function addBillType(data: {
  name: string
  category: string
  is_metered: boolean
  unit_of_measure: string | null
}) {
  const supabase = createAdminClient()
  const { error } = await (supabase as any).from('bill_types').insert(data)
  if (error) return { error: (error as any).message }
  revalidatePath('/admin/settings')
  return { error: null }
}

export async function deleteBillType(id: string) {
  const supabase = createAdminClient()
  const { error } = await (supabase as any).from('bill_types').delete().eq('id', id)
  if (error) return { error: (error as any).message }
  revalidatePath('/admin/settings')
  return { error: null }
}

export async function addProperty(managerId: string, name: string, address: string) {
  const supabase = createAdminClient()
  const { error } = await (supabase as any)
    .from('properties')
    .insert({ name, address, manager_id: managerId, settings: {} })
  if (error) return { error: (error as any).message }
  revalidateAdminRoutes()
  return { error: null }
}

export async function addUnit(data: {
  property_id: string
  unit_number: string
  floor: number | null
  sq_ft: number | null
  bedrooms: number
  bathrooms: number
}) {
  const supabase = createAdminClient()
  const { error } = await (supabase as any).from('units').insert(data)
  if (error) return { error: (error as any).message }
  revalidateAdminRoutes()
  return { error: null }
}

export async function updateUnit(id: string, data: {
  unit_number: string
  floor: number | null
  sq_ft: number | null
  bedrooms: number
  bathrooms: number
}) {
  const supabase = createAdminClient()
  const { error } = await (supabase as any).from('units').update(data).eq('id', id)
  if (error) return { error: (error as any).message }

  // Recalculate pending invoices for all bills in this unit's property
  // so sq_ft / occupancy splits immediately reflect the new values
  const { data: unit } = await (supabase as any)
    .from('units').select('property_id').eq('id', id).single()
  if (unit?.property_id) {
    await recalculatePendingForProperty(unit.property_id)
  }

  revalidateAdminRoutes()
  return { error: null }
}

export async function revalidateBills() {
  revalidateAdminRoutes()
}

export async function recalculatePendingInvoices(billId: string): Promise<{ count: number; error?: string }> {
  const { calculateSplit } = await import('@apt-keeper/db')
  const supabase = createAdminClient()

  const { data: bill, error: billErr } = await (supabase as any)
    .from('bills')
    .select('id, property_id, amount, split_rule_id, split_rules(method, config)')
    .eq('id', billId)
    .single()

  if (billErr || !bill) return { count: 0, error: 'Bill not found' }

  // Supabase nested select can return object or array depending on FK direction
  const splitRule = Array.isArray(bill.split_rules)
    ? (bill.split_rules[0] ?? null)
    : (bill.split_rules ?? null)

  // Only touch invoices that still have an outstanding balance
  const { data: rawInvoices, error: invErr } = await (supabase as any)
    .from('invoices')
    .select('id, unit_id, amount_due, amount_paid, status')
    .eq('bill_id', billId)
    .in('status', ['pending', 'overdue', 'partial'])

  if (invErr) return { count: 0, error: invErr.message }

  // JS-level safety: drop any invoice that is fully settled (should not happen but guard anyway)
  const invoices = ((rawInvoices ?? []) as any[]).filter(
    (inv: any) => inv.amount_paid < inv.amount_due
  )
  if (!invoices.length) return { count: 0 }

  // Use ALL active units for the property as the denominator.
  // Proportional methods (sq_ft, occupancy) need every unit's weight, not
  // just those that still owe money — otherwise paid-unit shares get redistributed.
  const { data: allPropertyUnits } = await (supabase as any)
    .from('units')
    .select('id, sq_ft')
    .eq('property_id', bill.property_id)

  const { data: leases } = await (supabase as any)
    .from('leases')
    .select('unit_id')
    .in('unit_id', (allPropertyUnits ?? []).map((u: any) => u.id))
    .eq('status', 'active')

  const activeUnitIds = new Set((leases ?? []).map((l: any) => l.unit_id))
  const activeUnits = (allPropertyUnits ?? []).filter((u: any) => activeUnitIds.has(u.id))

  const splitAmounts = calculateSplit(bill.amount, activeUnits, splitRule)

  let updated = 0
  for (const inv of invoices) {
    const rawAmount = splitAmounts[inv.unit_id]

    // Unit not in active split (e.g. lease ended) — skip
    if (rawAmount == null || rawAmount === 0) continue

    // Never lower amount_due below what was already paid
    const newAmountDue = Math.max(rawAmount, inv.amount_paid)

    // No change needed
    if (newAmountDue === inv.amount_due) continue

    // Only valid status promotion: partial → paid when the amount now equals what was paid
    const newStatus =
      newAmountDue === inv.amount_paid && inv.amount_paid > 0
        ? 'paid'
        : inv.status   // keep existing status (pending / overdue / partial)

    await (supabase as any)
      .from('invoices')
      .update({ amount_due: newAmountDue, status: newStatus })
      .eq('id', inv.id)

    updated++
  }

  revalidateAdminRoutes()
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/bills')
  return { count: updated }
}

// Recalculates all pending invoices for every active bill in a property.
// Called after unit edits so sq_ft/occupancy splits update immediately.
export async function recalculatePendingForProperty(propertyId: string): Promise<{ count: number }> {
  const supabase = createAdminClient()
  const { data: bills } = await (supabase as any)
    .from('bills')
    .select('id')
    .eq('property_id', propertyId)
    .eq('status', 'active')

  if (!bills?.length) return { count: 0 }

  let total = 0
  for (const bill of bills as any[]) {
    const { count } = await recalculatePendingInvoices(bill.id)
    total += count
  }
  return { count: total }
}

export async function assignLease(data: {
  unit_id: string
  resident_id: string
  start_date: string
  end_date: string | null
  monthly_rent: number
}) {
  const supabase = createAdminClient()
  const { error } = await (supabase as any)
    .from('leases')
    .insert({ ...data, status: 'active' })
  if (error) return { error: (error as any).message }
  revalidateAdminRoutes()
  return { error: null }
}

export async function createAdminMaintenanceRequest(formData: FormData) {
  const supabase = createAdminClient()
  const unitId = formData.get('unit_id') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const priority = (formData.get('priority') as string) ?? 'P3'

  if (!unitId || !title || !description) return { error: 'All fields are required' }

  // Get the active lease to find the resident
  const { data: lease } = await (supabase as any)
    .from('leases')
    .select('resident_id')
    .eq('unit_id', unitId)
    .eq('status', 'active')
    .single()

  if (!lease) return { error: 'No active lease found for this unit' }

  const SLA_HOURS: Record<string, number> = { P1: 4, P2: 24, P3: 72, P4: 168 }
  const slaDeadline = new Date(Date.now() + (SLA_HOURS[priority] ?? 72) * 3_600_000).toISOString()

  const { error } = await (supabase as any)
    .from('maintenance_requests')
    .insert({
      unit_id: unitId,
      resident_id: lease.resident_id,
      title,
      description,
      priority,
      status: 'open',
      sla_deadline: slaDeadline,
    })

  if (error) return { error: error.message }
  revalidatePath('/admin/maintenance')
  return { error: null }
}

export async function generateInvoicesNow(): Promise<{
  message: string
  count: number
  error?: string
}> {
  const { calculateSplit } = await import('@apt-keeper/db')
  const { randomUUID } = await import('crypto')

  const supabase = createAdminClient()
  const generationBatchId = randomUUID()

  const now = new Date()
  const todayIso = now.toISOString()

  // Fetch bills including due_date so we use each bill's own due date
  const { data: activeBills, error: billsError } = await (supabase as any)
    .from('bills')
    .select('id, property_id, amount, split_rule_id, due_date')
    .eq('status', 'active')
    .lte('billing_period_start', todayIso)

  if (billsError) return { message: 'Error fetching bills', count: 0, error: billsError.message }
  if (!activeBills?.length) return { message: 'No active bills found', count: 0 }

  const propertyIds = [...new Set((activeBills as any[]).map((b: any) => b.property_id))]

  const [{ data: splitRules }, { data: units }, { data: activeLeases }] = await Promise.all([
    (supabase as any).from('split_rules').select('*').in('property_id', propertyIds),
    (supabase as any).from('units').select('id, unit_number, sq_ft, property_id').in('property_id', propertyIds),
    (supabase as any).from('leases').select('id, unit_id, resident_id').eq('status', 'active'),
  ])

  const splitRuleMap = Object.fromEntries(((splitRules ?? []) as any[]).map((r: any) => [r.id, r]))
  const leaseByUnit = Object.fromEntries(((activeLeases ?? []) as any[]).map((l: any) => [l.unit_id, l]))

  const invoicesToInsert: any[] = []

  for (const bill of activeBills as any[]) {
    const billUnits = ((units ?? []) as any[]).filter((u: any) => u.property_id === bill.property_id)
    const activeUnits = billUnits.filter((u: any) => leaseByUnit[u.id])
    if (!activeUnits.length) continue

    const splitRule = splitRuleMap[bill.split_rule_id] ?? null
    const splitAmounts = calculateSplit(bill.amount, activeUnits, splitRule)

    for (const unit of activeUnits) {
      const lease = leaseByUnit[unit.id]
      if (!lease) continue

      // One invoice per bill+unit — no due_date in check to avoid duplicates
      // when bill.due_date differs from previously generated invoices
      const { data: existing } = await (supabase as any)
        .from('invoices')
        .select('id')
        .eq('bill_id', bill.id)
        .eq('unit_id', unit.id)
        .maybeSingle()

      if (!existing) {
        invoicesToInsert.push({
          unit_id: unit.id,
          lease_id: lease.id,
          bill_id: bill.id,
          amount_due: splitAmounts[unit.id] ?? 0,
          amount_paid: 0,
          status: 'pending',
          due_date: bill.due_date,
          generation_batch_id: generationBatchId,
        })
      }
    }
  }

  if (invoicesToInsert.length > 0) {
    const { error } = await (supabase as any).from('invoices').insert(invoicesToInsert)
    if (error) return { message: 'Insert failed', count: 0, error: error.message }

    // Send invoice notification emails to residents (fire-and-forget)
    const residentIds = [...new Set(invoicesToInsert.map((inv) => {
      const lease = ((activeLeases ?? []) as any[]).find((l: any) => l.id === inv.lease_id)
      return lease?.resident_id
    }).filter(Boolean))]

    if (residentIds.length) {
      const { data: residentUsers } = await (supabase as any)
        .from('users')
        .select('id, email, full_name')
        .in('id', residentIds)

      const { data: billTypes } = await (supabase as any)
        .from('bills')
        .select('id, due_date, bill_types(name)')
        .in('id', [...new Set(invoicesToInsert.map((i) => i.bill_id))])

      const billTypeMap = Object.fromEntries(
        ((billTypes ?? []) as any[]).map((b: any) => [b.id, b])
      )
      const unitMap = Object.fromEntries(((units ?? []) as any[]).map((u: any) => [u.id, u]))
      const leaseMap = Object.fromEntries(((activeLeases ?? []) as any[]).map((l: any) => [l.id, l]))
      const residentMap = Object.fromEntries(((residentUsers ?? []) as any[]).map((r: any) => [r.id, r]))

      for (const inv of invoicesToInsert) {
        const lease = leaseMap[inv.lease_id]
        const resident = residentMap[lease?.resident_id]
        const unit = unitMap[inv.unit_id]
        const bill = billTypeMap[inv.bill_id]
        if (!resident?.email) continue
        const billName = bill?.bill_types?.name ?? 'Bill'
        const { subject, html } = buildInvoiceGeneratedEmail({
          residentName: resident.full_name || resident.email,
          unitNumber: unit?.unit_number ?? '',
          amountDue: inv.amount_due,
          billDescription: billName,
          dueDate: inv.due_date
            ? new Date(inv.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : '—',
        })
        sendEmail(resident.email, subject, html).catch(() => {})
      }
    }
  }

  revalidateAdminRoutes()
  return {
    message: invoicesToInsert.length
      ? `Generated ${invoicesToInsert.length} invoices`
      : 'All invoices already exist for this period',
    count: invoicesToInsert.length,
  }
}
