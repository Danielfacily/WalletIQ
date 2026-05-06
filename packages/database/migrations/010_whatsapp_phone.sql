-- ══════════════════════════════════════════════════════════
--  WalletIQ — Migration 010: WhatsApp / Phone Integration
-- ══════════════════════════════════════════════════════════

-- 1. Add phone number to profiles (used to link WhatsApp)
alter table public.profiles
  add column if not exists phone text;

-- Unique index so we can look up a user by phone number in the webhook
create unique index if not exists idx_profiles_phone
  on public.profiles(phone)
  where phone is not null;

-- 2. Ensure transactions.source column exists (added in 003b for Pluggy,
--    now also used for 'whatsapp' as source value)
alter table public.transactions
  add column if not exists source text default 'manual';

-- Update check to allow 'whatsapp' as a valid source value
-- (no constraint existed before, so no action needed beyond ensuring column)

-- 3. Ensure financial_plans table exists (referenced by /api/planning)
create table if not exists public.financial_plans (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references public.profiles on delete cascade not null,
  year            int not null,
  month           int not null,
  unique(user_id, year, month),
  income_base     numeric(14,2) default 0,
  needs_budget    numeric(14,2) default 0,
  wants_budget    numeric(14,2) default 0,
  savings_budget  numeric(14,2) default 0,
  limits          jsonb default '{}',   -- per-category custom limits
  auto_generated  boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.financial_plans enable row level security;
create policy "Users manage own financial plans" on public.financial_plans
  for all using (auth.uid() = user_id);

create index if not exists idx_financial_plans_user
  on public.financial_plans(user_id, year desc, month desc);

create trigger trg_fp_plan_updated_at
  before update on public.financial_plans
  for each row execute function public.set_updated_at();
