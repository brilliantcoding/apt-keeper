-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────
create type user_role as enum ('super_admin', 'manager', 'staff', 'resident');
create type invoice_status as enum ('pending', 'partial', 'paid', 'overdue', 'cancelled');
create type maintenance_status as enum ('open', 'in_progress', 'completed', 'closed');
create type maintenance_priority as enum ('P1', 'P2', 'P3', 'P4');
create type bill_split_method as enum ('equal', 'sq_ft', 'occupancy', 'percentage', 'fixed', 'metered', 'tiered');
create type notification_channel as enum ('push', 'email', 'sms');
create type payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');
create type lease_status as enum ('active', 'expired', 'terminated');
create type bill_status as enum ('draft', 'active', 'inactive');
create type reminder_status as enum ('queued', 'sent', 'partial', 'failed');

-- ─── Users ───────────────────────────────────────────────────────────────────
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique,
  phone         text,
  full_name     text not null default '',
  role          user_role not null default 'resident',
  avatar_url    text,
  fcm_token     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Properties ──────────────────────────────────────────────────────────────
create table public.properties (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  address     text not null,
  manager_id  uuid not null references public.users(id),
  settings    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- ─── Units ───────────────────────────────────────────────────────────────────
create table public.units (
  id            uuid primary key default uuid_generate_v4(),
  property_id   uuid not null references public.properties(id) on delete cascade,
  unit_number   text not null,
  floor         int,
  sq_ft         numeric,
  bedrooms      int not null default 1,
  bathrooms     numeric not null default 1,
  created_at    timestamptz not null default now(),
  unique(property_id, unit_number)
);

-- ─── Leases ──────────────────────────────────────────────────────────────────
create table public.leases (
  id              uuid primary key default uuid_generate_v4(),
  unit_id         uuid not null references public.units(id) on delete cascade,
  resident_id     uuid not null references public.users(id),
  start_date      date not null,
  end_date        date,
  status          lease_status not null default 'active',
  monthly_rent    int not null,
  created_at      timestamptz not null default now()
);

-- ─── Bill Types ──────────────────────────────────────────────────────────────
create table public.bill_types (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null unique,
  category        text not null default 'utility',
  is_metered      boolean not null default false,
  unit_of_measure text,
  created_at      timestamptz not null default now()
);

insert into public.bill_types (name, category, is_metered) values
  ('Water', 'utility', true),
  ('Electricity', 'utility', true),
  ('Gas', 'utility', true),
  ('Internet', 'utility', false),
  ('HOA Fee', 'hoa', false),
  ('Maintenance Fund', 'maintenance', false),
  ('Trash', 'utility', false),
  ('Pest Control', 'maintenance', false);

-- ─── Split Rules ─────────────────────────────────────────────────────────────
create table public.split_rules (
  id              uuid primary key default uuid_generate_v4(),
  property_id     uuid not null references public.properties(id) on delete cascade,
  bill_type_id    uuid references public.bill_types(id),
  method          bill_split_method not null default 'equal',
  config          jsonb not null default '{}',
  effective_date  date not null default current_date,
  created_at      timestamptz not null default now()
);

-- ─── Bills ───────────────────────────────────────────────────────────────────
create table public.bills (
  id                    uuid primary key default uuid_generate_v4(),
  property_id           uuid not null references public.properties(id) on delete cascade,
  bill_type_id          uuid not null references public.bill_types(id),
  amount                int not null,
  billing_period_start  date not null,
  billing_period_end    date not null,
  due_date              date not null,
  split_rule_id         uuid references public.split_rules(id),
  status                bill_status not null default 'active',
  created_by            uuid not null references public.users(id),
  created_at            timestamptz not null default now()
);

-- ─── Invoices ────────────────────────────────────────────────────────────────
create table public.invoices (
  id                    uuid primary key default uuid_generate_v4(),
  unit_id               uuid not null references public.units(id),
  lease_id              uuid not null references public.leases(id),
  bill_id               uuid not null references public.bills(id),
  amount_due            int not null,
  amount_paid           int not null default 0,
  status                invoice_status not null default 'pending',
  due_date              date not null,
  generation_batch_id   uuid,
  created_at            timestamptz not null default now()
);

create index idx_invoices_status on public.invoices(status);
create index idx_invoices_due_date on public.invoices(due_date);
create index idx_invoices_unit_id on public.invoices(unit_id);

-- ─── Payments ────────────────────────────────────────────────────────────────
create table public.payments (
  id                          uuid primary key default uuid_generate_v4(),
  invoice_id                  uuid not null references public.invoices(id),
  amount                      int not null,
  payment_method              text not null default 'stripe',
  stripe_payment_intent_id    text,
  status                      payment_status not null default 'pending',
  paid_at                     timestamptz,
  created_at                  timestamptz not null default now()
);

-- ─── Notification Preferences ────────────────────────────────────────────────
create table public.notification_preferences (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  channel     notification_channel not null,
  event_type  text not null,
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  unique(user_id, channel, event_type)
);

-- ─── Reminders ───────────────────────────────────────────────────────────────
create table public.reminders (
  id            uuid primary key default uuid_generate_v4(),
  invoice_id    uuid not null references public.invoices(id) on delete cascade,
  stage         int not null check (stage between 1 and 8),
  scheduled_at  timestamptz not null,
  sent_at       timestamptz,
  channel       text not null,
  status        reminder_status not null default 'queued',
  created_at    timestamptz not null default now(),
  unique(invoice_id, stage)
);

-- ─── Maintenance Requests ────────────────────────────────────────────────────
create table public.maintenance_requests (
  id            uuid primary key default uuid_generate_v4(),
  unit_id       uuid not null references public.units(id),
  resident_id   uuid not null references public.users(id),
  title         text not null,
  description   text not null,
  priority      maintenance_priority not null default 'P3',
  status        maintenance_status not null default 'open',
  assigned_to   uuid references public.users(id),
  sla_deadline  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_maintenance_status on public.maintenance_requests(status);
create index idx_maintenance_resident on public.maintenance_requests(resident_id);

-- ─── Maintenance Comments ────────────────────────────────────────────────────
create table public.maintenance_comments (
  id          uuid primary key default uuid_generate_v4(),
  request_id  uuid not null references public.maintenance_requests(id) on delete cascade,
  author_id   uuid not null references public.users(id),
  body        text not null,
  created_at  timestamptz not null default now()
);

-- ─── Maintenance Photos ──────────────────────────────────────────────────────
create table public.maintenance_photos (
  id            uuid primary key default uuid_generate_v4(),
  request_id    uuid not null references public.maintenance_requests(id) on delete cascade,
  storage_path  text not null,
  uploaded_by   uuid not null references public.users(id),
  created_at    timestamptz not null default now()
);

-- ─── Audit Logs ──────────────────────────────────────────────────────────────
create table public.audit_logs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.users(id),
  action        text not null,
  entity_type   text not null,
  entity_id     uuid,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create index idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

-- ─── Updated At Trigger ──────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger set_users_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();

create trigger set_maintenance_updated_at
  before update on public.maintenance_requests
  for each row execute procedure public.set_updated_at();
