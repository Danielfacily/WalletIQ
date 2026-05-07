-- ══════════════════════════════════════════════════════════
--  WalletIQ — Script consolidado de todas as migrations
--  Cole e execute no Supabase SQL Editor (em uma única vez)
-- ══════════════════════════════════════════════════════════

-- ── Extensão UUID ──────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ══════════════════════════════════════════════════════════
--  TRANSACTIONS — coluna source (003b)
-- ══════════════════════════════════════════════════════════
alter table public.transactions
  add column if not exists source      text default 'manual',
  add column if not exists external_id text;

create unique index if not exists idx_transactions_external_id
  on public.transactions(external_id)
  where external_id is not null;

-- ══════════════════════════════════════════════════════════
--  GOALS (005)
-- ══════════════════════════════════════════════════════════
create table if not exists public.goals (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references public.profiles on delete cascade not null,
  name          text not null,
  emoji         text default '🎯',
  target_amount numeric(14,2) not null,
  saved_amount  numeric(14,2) default 0,
  deadline      date,
  category      text default 'outro',
  monthly_target numeric(14,2),
  priority      int default 1,
  created_at    timestamptz default now()
);

alter table public.goals enable row level security;

do $$ begin
  create policy "Users manage own goals" on public.goals
    for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_goals_user on public.goals(user_id);

-- ══════════════════════════════════════════════════════════
--  FINANCIAL PROFILES (006)
-- ══════════════════════════════════════════════════════════
create table if not exists public.financial_profiles (
  id                  uuid default uuid_generate_v4() primary key,
  user_id             uuid references public.profiles on delete cascade not null unique,
  monthly_income      numeric(14,2) default 0,
  extra_income        numeric(14,2) default 0,
  profile_type        text default 'undefined',
  risk_level          text default 'moderate',
  has_emergency_fund  boolean default false,
  emergency_months    int default 0,
  has_debt            boolean default false,
  total_debt          numeric(14,2) default 0,
  main_goal           text,
  savings_target_pct  int default 20,
  onboarding_done     boolean default false,
  onboarding_step     int default 0,
  updated_at          timestamptz default now(),
  created_at          timestamptz default now()
);

alter table public.financial_profiles enable row level security;

do $$ begin
  create policy "Users manage own financial profile" on public.financial_profiles
    for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_fp_user on public.financial_profiles(user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$ begin
  create trigger trg_fp_updated_at
    before update on public.financial_profiles
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- ══════════════════════════════════════════════════════════
--  ALERTS (007)
-- ══════════════════════════════════════════════════════════
create table if not exists public.alerts (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles on delete cascade not null,
  type        text not null,
  severity    text default 'info',
  title       text not null,
  message     text not null,
  category    text,
  amount      numeric(14,2),
  read        boolean default false,
  dismissed   boolean default false,
  created_at  timestamptz default now()
);

alter table public.alerts enable row level security;

do $$ begin
  create policy "Users manage own alerts" on public.alerts
    for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_alerts_user_unread on public.alerts(user_id, read, dismissed);
create index if not exists idx_alerts_created on public.alerts(created_at desc);

-- ══════════════════════════════════════════════════════════
--  FINANCIAL PLANS (008 + 010)
-- ══════════════════════════════════════════════════════════
create table if not exists public.financial_plans (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references public.profiles on delete cascade not null,
  year            int not null,
  month           int not null,
  income_base     numeric(14,2) default 0,
  needs_budget    numeric(14,2) default 0,
  wants_budget    numeric(14,2) default 0,
  savings_budget  numeric(14,2) default 0,
  limits          jsonb default '{}',
  needs_actual    numeric(14,2),
  wants_actual    numeric(14,2),
  savings_actual  numeric(14,2),
  status          text default 'active',
  auto_generated  boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(user_id, year, month)
);

alter table public.financial_plans enable row level security;

do $$ begin
  create policy "Users manage own financial plans" on public.financial_plans
    for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_plans_user_period on public.financial_plans(user_id, year, month);
create index if not exists idx_financial_plans_user on public.financial_plans(user_id, year desc, month desc);

do $$ begin
  create trigger trg_fp_plan_updated_at
    before update on public.financial_plans
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

-- ══════════════════════════════════════════════════════════
--  REPORTS (009)
-- ══════════════════════════════════════════════════════════
create table if not exists public.reports (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references public.profiles on delete cascade not null,
  period_type     text not null,
  period_start    date not null,
  period_end      date not null,
  unique(user_id, period_start, period_end),
  summary         jsonb default '{}',
  insights        jsonb default '[]',
  recommendations jsonb default '[]',
  waste_detected  jsonb default '[]',
  health_score    int default 0,
  savings_rate    numeric(6,2) default 0,
  generated_at    timestamptz default now(),
  read            boolean default false
);

alter table public.reports enable row level security;

do $$ begin
  create policy "Users view own reports" on public.reports
    for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_reports_user on public.reports(user_id, period_start desc);

-- ══════════════════════════════════════════════════════════
--  PHONE + INDEX (010)
-- ══════════════════════════════════════════════════════════
alter table public.profiles
  add column if not exists phone text;

create unique index if not exists idx_profiles_phone
  on public.profiles(phone)
  where phone is not null;

-- ══════════════════════════════════════════════════════════
--  FIXED BUDGETS (caso não exista)
-- ══════════════════════════════════════════════════════════
create table if not exists public.fixed_budgets (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles on delete cascade not null,
  name        text not null,
  amount      numeric(14,2) not null,
  type        text not null default 'expense',   -- income | expense
  category    text default 'other_ex',
  active      boolean default true,
  created_at  timestamptz default now()
);

alter table public.fixed_budgets enable row level security;

do $$ begin
  create policy "Users manage own fixed budgets" on public.fixed_budgets
    for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_fixed_budgets_user on public.fixed_budgets(user_id, active);
