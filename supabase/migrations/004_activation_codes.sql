-- Activation codes table
create table if not exists public.activation_codes (
  id           uuid primary key default gen_random_uuid(),
  code         text unique not null,
  email        text,
  created_by   uuid references public.users(id) on delete set null,
  used_by      uuid references public.users(id) on delete set null,
  used_at      timestamptz,
  expires_at   timestamptz,
  status       text not null default 'active'
                 check (status in ('active', 'used', 'revoked', 'expired')),
  created_at   timestamptz not null default now()
);

-- Link users to the activation code they used
alter table public.users
  add column if not exists activation_code_id uuid references public.activation_codes(id) on delete set null;

-- Indexes
create index if not exists idx_activation_codes_code   on public.activation_codes(code);
create index if not exists idx_activation_codes_status on public.activation_codes(status);
create index if not exists idx_activation_codes_email  on public.activation_codes(email);

-- RLS: admins manage codes, no direct resident access (all via service role API)
alter table public.activation_codes enable row level security;

create policy "Admins can manage activation codes"
  on public.activation_codes
  for all
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and role in ('manager', 'super_admin', 'staff')
    )
  );
