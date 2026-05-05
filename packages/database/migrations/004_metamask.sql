-- ══════════════════════════════════════════════════════════
--  WalletIQ — Migration 004: MetaMask / Crypto Wallets
--  Run in Supabase SQL Editor AFTER 003b_transactions_pluggy.sql
-- ══════════════════════════════════════════════════════════

create table if not exists public.crypto_wallets (
  id             uuid default uuid_generate_v4() primary key,
  user_id        uuid references public.profiles on delete cascade not null,
  address        text not null,
  label          text,
  chain          text not null default 'ethereum',
  eth_balance    numeric(28,18) default 0,
  last_synced_at timestamptz default now(),
  created_at     timestamptz default now(),
  unique(user_id, address)
);

alter table public.crypto_wallets enable row level security;
create policy "Users manage own crypto wallets" on public.crypto_wallets
  for all using (auth.uid() = user_id);

create index if not exists idx_crypto_wallets_user on public.crypto_wallets(user_id);
