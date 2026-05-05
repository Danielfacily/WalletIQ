-- ══════════════════════════════════════════════════════════
--  WalletIQ — Migration 005: Goals / Objetivos
-- ══════════════════════════════════════════════════════════

create table if not exists public.goals (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references public.profiles on delete cascade not null,
  name          text not null,
  emoji         text default '🎯',
  target_amount numeric(14,2) not null,
  saved_amount  numeric(14,2) default 0,
  deadline      date,
  created_at    timestamptz default now()
);

alter table public.goals enable row level security;
create policy "Users manage own goals" on public.goals
  for all using (auth.uid() = user_id);

create index if not exists idx_goals_user on public.goals(user_id);
