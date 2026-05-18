-- ══════════════════════════════════════════════════════════
--  WalletIQ — Migration 006: Financial Profile & Onboarding
-- ══════════════════════════════════════════════════════════

create table if not exists public.financial_profiles (
  id                  uuid default uuid_generate_v4() primary key,
  user_id             uuid references public.profiles on delete cascade not null unique,
  -- Income & expenses
  monthly_income      numeric(14,2) default 0,
  extra_income        numeric(14,2) default 0,  -- freelance, renda extra
  -- Profile classification
  profile_type        text default 'undefined',  -- conservative | moderate | aggressive | indebted | accumulator
  risk_level          text default 'moderate',   -- low | moderate | high
  -- Financial situation
  has_emergency_fund  boolean default false,
  emergency_months    int default 0,             -- months covered by emergency fund
  has_debt            boolean default false,
  total_debt          numeric(14,2) default 0,
  -- Goals
  main_goal           text,  -- emergencia | viagem | aposentadoria | imovel | veiculo | educacao | outro
  savings_target_pct  int default 20,            -- % of income to save
  -- Onboarding
  onboarding_done     boolean default false,
  onboarding_step     int default 0,
  -- Metadata
  updated_at          timestamptz default now(),
  created_at          timestamptz default now()
);

alter table public.financial_profiles enable row level security;
create policy "Users manage own financial profile" on public.financial_profiles
  for all using (auth.uid() = user_id);

create index if not exists idx_fp_user on public.financial_profiles(user_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_fp_updated_at
  before update on public.financial_profiles
  for each row execute function public.set_updated_at();
