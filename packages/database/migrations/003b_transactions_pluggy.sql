-- Add Pluggy sync fields to transactions table
alter table public.transactions
  add column if not exists source      text default 'manual',  -- 'manual' | 'pluggy'
  add column if not exists external_id text unique;            -- Pluggy transaction ID (prevents duplicates)

create index if not exists idx_transactions_external_id
  on public.transactions(external_id)
  where external_id is not null;
