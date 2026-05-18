-- ══════════════════════════════════════════════════════════
--  WalletIQ — Migration 003: Pluggy Open Finance
--  Run in Supabase SQL Editor AFTER 002_stripe.sql
-- ══════════════════════════════════════════════════════════

-- Connected bank items (one row per bank connection)
create table if not exists public.pluggy_items (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references public.profiles on delete cascade not null,
  item_id         text not null unique,          -- Pluggy item ID
  connector_name  text not null,                 -- e.g. "Nubank", "Itaú"
  connector_id    int  not null,
  status          text not null default 'UPDATED', -- UPDATED | UPDATING | LOGIN_ERROR | OUTDATED
  last_synced_at  timestamptz default now(),
  created_at      timestamptz default now()
);
alter table public.pluggy_items enable row level security;
create policy "Users manage own pluggy items" on public.pluggy_items
  for all using (auth.uid() = user_id);

-- Bank accounts linked to items
create table if not exists public.pluggy_accounts (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles on delete cascade not null,
  item_id     uuid references public.pluggy_items on delete cascade not null,
  account_id  text not null unique,              -- Pluggy account ID
  name        text not null,
  type        text not null,                     -- BANK | CREDIT
  subtype     text,                              -- CHECKING | SAVINGS | CREDIT_CARD
  balance     numeric(14,2) default 0,
  currency    text default 'BRL',
  updated_at  timestamptz default now()
);
alter table public.pluggy_accounts enable row level security;
create policy "Users manage own pluggy accounts" on public.pluggy_accounts
  for all using (auth.uid() = user_id);

-- Index for fast lookup by user
create index if not exists idx_pluggy_items_user   on public.pluggy_items(user_id);
create index if not exists idx_pluggy_accounts_item on public.pluggy_accounts(item_id);
