-- ══════════════════════════════════════════════════════════
--  WalletIQ — Migration 008: Financial Plans (50/30/20)
-- ══════════════════════════════════════════════════════════

create table if not exists public.financial_plans (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references public.profiles on delete cascade not null,
  year            int not null,
  month           int not null,  -- 1-12
  -- 50/30/20 base allocation
  income_base     numeric(14,2) default 0,
  needs_budget    numeric(14,2) default 0,   -- 50% essentials
  wants_budget    numeric(14,2) default 0,   -- 30% lifestyle
  savings_budget  numeric(14,2) default 0,   -- 20% savings/goals
  -- Category limits (auto-generated)
  limits          jsonb default '{}',
  -- Actual vs planned (populated at month end)
  needs_actual    numeric(14,2),
  wants_actual    numeric(14,2),
  savings_actual  numeric(14,2),
  -- Status
  status          text default 'active',   -- active | completed | skipped
  auto_generated  boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(user_id, year, month)
);

alter table public.financial_plans enable row level security;
create policy "Users manage own plans" on public.financial_plans
  for all using (auth.uid() = user_id);

create index if not exists idx_plans_user_period on public.financial_plans(user_id, year, month);

create trigger trg_plans_updated_at
  before update on public.financial_plans
  for each row execute function public.set_updated_at();
