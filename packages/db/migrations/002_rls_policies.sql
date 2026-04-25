-- ─── Enable RLS ──────────────────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.leases enable row level security;
alter table public.bills enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.maintenance_comments enable row level security;
alter table public.maintenance_photos enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.reminders enable row level security;
alter table public.audit_logs enable row level security;

-- ─── Helper: current user role ───────────────────────────────────────────────
create or replace function public.current_user_role()
returns user_role language sql security definer stable as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_manager_or_above()
returns boolean language sql security definer stable as $$
  select role in ('manager', 'super_admin') from public.users where id = auth.uid();
$$;

-- ─── Users ───────────────────────────────────────────────────────────────────
create policy "Users: own profile" on public.users
  for all using (id = auth.uid());

create policy "Users: managers can read all" on public.users
  for select using (public.is_manager_or_above());

-- ─── Properties ──────────────────────────────────────────────────────────────
create policy "Properties: managers see their properties" on public.properties
  for all using (manager_id = auth.uid() or public.current_user_role() = 'super_admin');

create policy "Properties: residents see property they live in" on public.properties
  for select using (
    exists (
      select 1 from public.units u
      join public.leases l on l.unit_id = u.id
      where u.property_id = properties.id
        and l.resident_id = auth.uid()
        and l.status = 'active'
    )
  );

-- ─── Units ───────────────────────────────────────────────────────────────────
create policy "Units: residents see their unit" on public.units
  for select using (
    exists (
      select 1 from public.leases l
      where l.unit_id = units.id and l.resident_id = auth.uid() and l.status = 'active'
    )
  );

create policy "Units: managers see their property's units" on public.units
  for all using (
    exists (
      select 1 from public.properties p
      where p.id = units.property_id
        and (p.manager_id = auth.uid() or public.current_user_role() = 'super_admin')
    )
  );

-- ─── Leases ──────────────────────────────────────────────────────────────────
create policy "Leases: residents see own" on public.leases
  for select using (resident_id = auth.uid());

create policy "Leases: managers manage" on public.leases
  for all using (public.is_manager_or_above());

-- ─── Bills ───────────────────────────────────────────────────────────────────
create policy "Bills: managers manage" on public.bills
  for all using (public.is_manager_or_above());

create policy "Bills: residents see bills for their property" on public.bills
  for select using (
    exists (
      select 1 from public.units u
      join public.leases l on l.unit_id = u.id
      where u.property_id = bills.property_id
        and l.resident_id = auth.uid()
        and l.status = 'active'
    )
  );

-- ─── Invoices ────────────────────────────────────────────────────────────────
create policy "Invoices: residents see own" on public.invoices
  for select using (
    exists (
      select 1 from public.leases l
      where l.id = invoices.lease_id and l.resident_id = auth.uid()
    )
  );

create policy "Invoices: managers see all" on public.invoices
  for all using (public.is_manager_or_above());

-- ─── Payments ────────────────────────────────────────────────────────────────
create policy "Payments: residents see own" on public.payments
  for select using (
    exists (
      select 1 from public.invoices i
      join public.leases l on l.id = i.lease_id
      where i.id = payments.invoice_id and l.resident_id = auth.uid()
    )
  );

create policy "Payments: managers see all" on public.payments
  for all using (public.is_manager_or_above());

-- ─── Maintenance Requests ────────────────────────────────────────────────────
create policy "Maintenance: residents see and create own" on public.maintenance_requests
  for all using (resident_id = auth.uid());

create policy "Maintenance: staff see assigned" on public.maintenance_requests
  for select using (
    assigned_to = auth.uid() or public.is_manager_or_above()
  );

create policy "Maintenance: managers manage all" on public.maintenance_requests
  for all using (public.is_manager_or_above());

-- ─── Maintenance Comments & Photos ───────────────────────────────────────────
create policy "Maint Comments: authors and managers" on public.maintenance_comments
  for all using (author_id = auth.uid() or public.is_manager_or_above());

create policy "Maint Photos: uploader and managers" on public.maintenance_photos
  for all using (uploaded_by = auth.uid() or public.is_manager_or_above());

-- ─── Notification Preferences ────────────────────────────────────────────────
create policy "Notif Prefs: own only" on public.notification_preferences
  for all using (user_id = auth.uid());

-- ─── Storage Buckets ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values
  ('maintenance-photos', 'maintenance-photos', false),
  ('documents', 'documents', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Maintenance photos: authenticated upload" on storage.objects
  for insert with check (bucket_id = 'maintenance-photos' and auth.role() = 'authenticated');

create policy "Maintenance photos: owner read" on storage.objects
  for select using (bucket_id = 'maintenance-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Avatars: public read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Avatars: own upload" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
