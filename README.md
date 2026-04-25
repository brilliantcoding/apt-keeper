# AptKeeper

Apartment Maintenance & Common Billing Platform — Phase 1

## Stack

| Layer | Service |
|---|---|
| Web app | Next.js 15 (App Router) on **Vercel** |
| Mobile app | React Native + Expo |
| Database + Auth + Storage | **Supabase** (PostgreSQL 16, RLS, JWT) |
| Cache + Queue | **Upstash Redis + QStash** |
| Push notifications | **Firebase FCM** |
| Email | **Resend** |
| SMS | **Twilio** |
| Scheduling | **Vercel Crons** (or cron-job.org as fallback) |
| Payments | **Stripe Checkout** |

## Monorepo Layout

```
apt-keeper/
├── apps/
│   ├── web/          # Next.js 15 — Vercel
│   └── mobile/       # Expo React Native
├── packages/
│   ├── db/           # TypeScript types, Supabase migrations, split-engine
│   └── ui/           # (coming — shared shadcn components)
```

## Getting Started

### 1. Prerequisites

- Node 20+, pnpm 9+
- Supabase account → create a project
- Copy `.env.example` to `.env.local` and fill in all values

### 2. Install

```bash
pnpm install
```

### 3. Database Setup

Run the SQL migrations in Supabase **SQL Editor** in order:

```
packages/db/migrations/001_initial_schema.sql
packages/db/migrations/002_rls_policies.sql
```

### 4. Supabase Storage

Create buckets in Supabase Storage:
- `maintenance-photos` (private)
- `documents` (private)
- `avatars` (public)

### 5. Run locally

```bash
pnpm dev          # starts web on http://localhost:3000
pnpm --filter @apt-keeper/mobile start   # starts Expo
```

## Cron Endpoints

| Endpoint | Schedule | Purpose |
|---|---|---|
| `POST /api/cron/generate-invoices` | 1st of every month | Split bills → create invoices |
| `POST /api/cron/send-reminders` | Every hour | Queue reminder notifications (8-stage escalation) |
| `POST /api/cron/check-sla` | Every hour | Flag breached maintenance SLAs |

All cron routes require `x-cron-secret` header matching `CRON_SECRET` env var.

## Reminder Escalation (8 stages)

| Stage | Timing | Channels |
|---|---|---|
| 1 | 7d before due | Email |
| 2 | 3d before due | Email + Push |
| 3 | Due day | Email + Push + SMS |
| 4 | 3d late (grace warning) | Email + Push + SMS |
| 5 | 5d late | Email + SMS |
| 6 | 10d late | Email + SMS |
| 7 | 15d late | Email + SMS + manager alert |
| 8 | 30d late | Email + SMS + manager alert |

## Bill Split Methods

- `equal` — divide equally
- `sq_ft` — proportional to unit square footage  
- `occupancy` — proportional to occupant count
- `percentage` — configured per-unit percentages
- `fixed` — fixed dollar amount per unit
- `metered` — proportional to meter readings
- `tiered` — tiered rate table on usage

## Deploy

### Web → Vercel

```bash
vercel --prod
```

Set all environment variables in Vercel dashboard.

### Mobile → Expo EAS

```bash
eas build --platform all
eas submit
```
