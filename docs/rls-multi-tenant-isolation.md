# Multi-Tenant RLS Isolation Fix

## Problem

`is_manager_or_above()` is a role-only check — any manager can read/write data from any other community. Properties are correctly scoped via `manager_id`, but all downstream tables use the broad helper instead of tracing back to that FK.

## Affected Tables

| Table | Current Policy | Leak |
|-------|---------------|------|
| `leases` | `is_manager_or_above()` | Manager A sees Manager B's leases |
| `bills` | `is_manager_or_above()` | Manager A sees Manager B's bills |
| `invoices` | `is_manager_or_above()` | Manager A sees Manager B's invoices |
| `payments` | `is_manager_or_above()` | Manager A sees Manager B's payments |
| `maintenance_requests` | `is_manager_or_above()` | Manager A sees Manager B's requests |
| `maintenance_comments` | `is_manager_or_above()` | Same |
| `maintenance_photos` | `is_manager_or_above()` | Same |

`bill_types` is a shared global catalog (no manager_id) — acceptable as-is since it holds generic types (Water, Electricity, etc.), not community data.

## Fix Strategy

Drop the broad manager policies on each table and replace with a **property-scoped** EXISTS check that walks the FK chain back to `properties.manager_id = auth.uid()`.

### FK chains per table

```
leases      → units.id         → properties.manager_id
bills       → bills.property_id → properties.manager_id
invoices    → units.id         → properties.manager_id
payments    → invoices.unit_id → properties.manager_id
maintenance_requests → units.id → properties.manager_id
maintenance_comments → maintenance_requests.unit_id → properties.manager_id
maintenance_photos   → maintenance_requests.unit_id → properties.manager_id
```

## Migration: `003_scoped_rls.sql`

Create this file at `packages/db/migrations/003_scoped_rls.sql` and run in Supabase SQL Editor.

```sql
-- ─── Drop broad manager policies ─────────────────────────────────────────────
drop policy if exists "Leases: managers manage"                  on public.leases;
drop policy if exists "Bills: managers manage"                   on public.bills;
drop policy if exists "Invoices: managers see all"               on public.invoices;
drop policy if exists "Payments: managers see all"               on public.payments;
drop policy if exists "Maintenance: managers manage all"         on public.maintenance_requests;
drop policy if exists "Maint Comments: authors and managers"     on public.maintenance_comments;
drop policy if exists "Maint Photos: uploader and managers"      on public.maintenance_photos;

-- ─── Leases: scoped to manager's properties ──────────────────────────────────
create policy "Leases: managers manage own properties" on public.leases
  for all using (
    public.current_user_role() = 'super_admin'
    or exists (
      select 1 from public.units u
      join public.properties p on p.id = u.property_id
      where u.id = leases.unit_id
        and p.manager_id = auth.uid()
    )
  );

-- ─── Bills: scoped to manager's properties ───────────────────────────────────
create policy "Bills: managers manage own properties" on public.bills
  for all using (
    public.current_user_role() = 'super_admin'
    or exists (
      select 1 from public.properties p
      where p.id = bills.property_id
        and p.manager_id = auth.uid()
    )
  );

-- ─── Invoices: scoped to manager's properties ────────────────────────────────
create policy "Invoices: managers manage own properties" on public.invoices
  for all using (
    public.current_user_role() = 'super_admin'
    or exists (
      select 1 from public.units u
      join public.properties p on p.id = u.property_id
      where u.id = invoices.unit_id
        and p.manager_id = auth.uid()
    )
  );

-- ─── Payments: scoped to manager's properties ────────────────────────────────
create policy "Payments: managers manage own properties" on public.payments
  for all using (
    public.current_user_role() = 'super_admin'
    or exists (
      select 1 from public.invoices i
      join public.units u on u.id = i.unit_id
      join public.properties p on p.id = u.property_id
      where i.id = payments.invoice_id
        and p.manager_id = auth.uid()
    )
  );

-- ─── Maintenance Requests: scoped to manager's properties ────────────────────
create policy "Maintenance: managers manage own properties" on public.maintenance_requests
  for all using (
    public.current_user_role() = 'super_admin'
    or exists (
      select 1 from public.units u
      join public.properties p on p.id = u.property_id
      where u.id = maintenance_requests.unit_id
        and p.manager_id = auth.uid()
    )
  );

-- ─── Maintenance Comments: scoped to manager's properties ────────────────────
create policy "Maint Comments: authors and property managers" on public.maintenance_comments
  for all using (
    author_id = auth.uid()
    or public.current_user_role() = 'super_admin'
    or exists (
      select 1 from public.maintenance_requests mr
      join public.units u on u.id = mr.unit_id
      join public.properties p on p.id = u.property_id
      where mr.id = maintenance_comments.request_id
        and p.manager_id = auth.uid()
    )
  );

-- ─── Maintenance Photos: scoped to manager's properties ──────────────────────
create policy "Maint Photos: uploader and property managers" on public.maintenance_photos
  for all using (
    uploaded_by = auth.uid()
    or public.current_user_role() = 'super_admin'
    or exists (
      select 1 from public.maintenance_requests mr
      join public.units u on u.id = mr.unit_id
      join public.properties p on p.id = u.property_id
      where mr.id = maintenance_photos.request_id
        and p.manager_id = auth.uid()
    )
  );
```

## Web App Changes Required

The web app uses `createAdminClient()` (service role key) for most admin queries, which **bypasses RLS entirely**. After applying the migration, the admin server actions must switch to the authenticated client for reads so RLS is enforced.

### Files to update

| File | Change |
|------|--------|
| `apps/web/src/app/admin/residents/page.tsx` | Use `createClient()` for resident/lease queries |
| `apps/web/src/app/admin/bills/page.tsx` | Use `createClient()` for bill queries |
| `apps/web/src/app/admin/invoices/page.tsx` | Use `createClient()` for invoice queries |
| `apps/web/src/app/admin/maintenance/page.tsx` | Use `createClient()` for maintenance queries |
| `apps/web/src/app/admin/units/page.tsx` | Use `createClient()` for unit queries |
| `apps/web/src/app/admin/actions.ts` | Use `createClient()` for mutating actions (not admin client) |

> **Note:** Keep `createAdminClient()` only for operations that legitimately need service role: sending password reset emails, generating activation codes, cron jobs.

## Implementation Order

1. Write `003_scoped_rls.sql` (SQL ready above — just create the file)
2. Run in Supabase SQL Editor on staging first, verify no data leaks
3. Update web app pages to use `createClient()` instead of `createAdminClient()` for data fetching
4. Test as two separate manager accounts — confirm cross-community data is invisible
5. Run on production Supabase

## Testing Checklist

- [ ] Manager A cannot see Manager B's properties
- [ ] Manager A cannot see Manager B's residents/leases
- [ ] Manager A cannot see Manager B's bills/invoices
- [ ] Manager A cannot see Manager B's maintenance requests
- [ ] Manager A cannot reset password for Manager B's residents
- [ ] `super_admin` can still see everything
- [ ] Residents still see only their own data
