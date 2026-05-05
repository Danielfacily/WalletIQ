-- ══════════════════════════════════════════════════════════
--  WalletIQ — Migration 002: Stripe + Plan Gates
--  Run in Supabase SQL Editor AFTER 001_initial.sql
-- ══════════════════════════════════════════════════════════

-- Add Stripe fields to profiles
alter table public.profiles
  add column if not exists stripe_customer_id  text unique,
  add column if not exists stripe_sub_id       text,
  add column if not exists plan_expires_at     timestamptz;

-- AI message counter (daily limit for Free plan)
create table if not exists public.ai_usage (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references public.profiles on delete cascade not null,
  date       date not null default current_date,
  msg_count  int  default 0,
  unique(user_id, date)
);
alter table public.ai_usage enable row level security;
create policy "Users see own usage" on public.ai_usage
  for all using (auth.uid() = user_id);

-- Function: increment AI message count
create or replace function public.increment_ai_usage(p_user_id uuid)
returns int language plpgsql security definer as $$
declare
  v_count int;
begin
  insert into public.ai_usage (user_id, date, msg_count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, date)
  do update set msg_count = ai_usage.msg_count + 1
  returning msg_count into v_count;
  return v_count;
end;
$$;

-- Function: get today's AI usage
create or replace function public.get_ai_usage_today(p_user_id uuid)
returns int language sql security definer as $$
  select coalesce(
    (select msg_count from public.ai_usage
     where user_id = p_user_id and date = current_date),
    0
  );
$$;

-- View: user plan status (easy to query)
create or replace view public.user_plan_status as
select
  p.id,
  p.plan,
  p.plan_expires_at,
  p.stripe_customer_id,
  case
    when p.plan = 'free'                                     then true
    when p.plan_expires_at is null                           then false
    when p.plan_expires_at > now()                           then true
    else false
  end as plan_active,
  coalesce(u.msg_count, 0) as ai_msgs_today
from public.profiles p
left join public.ai_usage u
  on u.user_id = p.id and u.date = current_date;

-- Index for Stripe customer lookup
create index if not exists idx_profiles_stripe_customer
  on public.profiles(stripe_customer_id)
  where stripe_customer_id is not null;
