-- ══════════════════════════════════════════════════════════
--  WalletIQ — Migration 009: Smart Reports
-- ══════════════════════════════════════════════════════════

create table if not exists public.reports (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references public.profiles on delete cascade not null,
  period_type     text not null,  -- weekly | monthly
  period_start    date not null,
  period_end      date not null,
  unique(user_id, period_start, period_end),
  -- Summary data (JSON for flexibility)
  summary         jsonb default '{}',
  insights        jsonb default '[]',  -- array of insight objects
  recommendations jsonb default '[]',  -- array of recommendation objects
  waste_detected  jsonb default '[]',  -- array of waste items
  -- Scores
  health_score    int default 0,  -- 0-100
  savings_rate    numeric(6,2) default 0,
  -- Status
  generated_at    timestamptz default now(),
  read            boolean default false
);

alter table public.reports enable row level security;
create policy "Users view own reports" on public.reports
  for all using (auth.uid() = user_id);

create index if not exists idx_reports_user on public.reports(user_id, period_start desc);

-- Goals: add category and monthly_target fields
alter table public.goals
  add column if not exists category text default 'outro',  -- emergencia | viagem | aposentadoria | imovel | veiculo | educacao | saude | outro
  add column if not exists monthly_target numeric(14,2),   -- suggested monthly contribution
  add column if not exists priority int default 1;         -- 1=high, 2=medium, 3=low
