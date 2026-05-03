-- Performance indexes based on common query patterns

-- invoices.lease_id is filtered/joined on nearly every page
create index if not exists idx_invoices_lease_id
  on public.invoices(lease_id);

-- invoices(bill_id, unit_id) used in generate-invoices duplicate check
create index if not exists idx_invoices_bill_unit
  on public.invoices(bill_id, unit_id);

-- leases(resident_id, status) used in dashboard and residents page
create index if not exists idx_leases_resident_status
  on public.leases(resident_id, status);

-- leases(unit_id, status) used in invoice generation to find active lease per unit
create index if not exists idx_leases_unit_status
  on public.leases(unit_id, status);

-- bills(property_id, status) used in bill API filters
create index if not exists idx_bills_property_status
  on public.bills(property_id, status);

-- reminders(invoice_id, stage) used in send-reminders duplicate check
create index if not exists idx_reminders_invoice_stage
  on public.reminders(invoice_id, stage);
