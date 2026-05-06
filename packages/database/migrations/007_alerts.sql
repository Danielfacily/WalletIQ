-- ══════════════════════════════════════════════════════════
--  WalletIQ — Migration 007: Smart Alerts
-- ══════════════════════════════════════════════════════════

create table if not exists public.alerts (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles on delete cascade not null,
  type        text not null,  -- overspend | low_balance | goal_risk | unused_sub | unusual_expense | savings_ok | plan_deviation
  severity    text default 'info',  -- info | warning | critical
  title       text not null,
  message     text not null,
  category    text,           -- related spending category (optional)
  amount      numeric(14,2),  -- related amount (optional)
  read        boolean default false,
  dismissed   boolean default false,
  created_at  timestamptz default now()
);

alter table public.alerts enable row level security;
create policy "Users manage own alerts" on public.alerts
  for all using (auth.uid() = user_id);

create index if not exists idx_alerts_user_unread on public.alerts(user_id, read, dismissed);
create index if not exists idx_alerts_created on public.alerts(created_at desc);
