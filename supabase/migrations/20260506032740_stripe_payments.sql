create table if not exists public.stripe_settings (
  id boolean primary key default true,
  enabled boolean not null default false,
  mode text not null default 'test' check (mode in ('test', 'live')),
  stripe_account_id text,
  commission_payer text not null default 'merchant' check (commission_payer in ('merchant', 'customer')),
  fee_percent numeric(6, 3) not null default 3.600,
  fixed_fee_amount numeric(12, 2) not null default 3.00,
  minimum_payment_amount numeric(12, 2) not null default 100.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stripe_settings_singleton check (id = true),
  constraint stripe_settings_fee_percent_nonnegative check (fee_percent >= 0),
  constraint stripe_settings_fixed_fee_nonnegative check (fixed_fee_amount >= 0),
  constraint stripe_settings_minimum_payment_positive check (minimum_payment_amount >= 1)
);

insert into public.stripe_settings (id, stripe_account_id)
values (true, 'acct_1SHFKe2R4B7Tceo0')
on conflict (id) do nothing;

alter table public.orders
  add column if not exists stripe_enabled boolean not null default false,
  add column if not exists stripe_payment_mode text not null default 'customer_amount' check (stripe_payment_mode in ('customer_amount', 'fixed_amounts')),
  add column if not exists stripe_min_payment_amount numeric(12, 2),
  add column if not exists stripe_fixed_payment_amounts jsonb not null default '[]'::jsonb;

alter table public.orders
  add constraint orders_stripe_min_payment_nonnegative
  check (stripe_min_payment_amount is null or stripe_min_payment_amount >= 1);

create table if not exists public.stripe_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  stripe_session_id text not null unique,
  stripe_payment_intent_id text unique,
  amount numeric(12, 2) not null,
  fee_amount numeric(12, 2) not null default 0,
  total_charged numeric(12, 2) not null,
  commission_payer text not null check (commission_payer in ('merchant', 'customer')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists stripe_checkout_sessions_order_id_created_at_idx
on public.stripe_checkout_sessions (order_id, created_at desc);

create index if not exists stripe_checkout_sessions_status_created_at_idx
on public.stripe_checkout_sessions (status, created_at desc);

alter table public.stripe_settings enable row level security;
alter table public.stripe_checkout_sessions enable row level security;

drop policy if exists "admin_all_stripe_settings" on public.stripe_settings;
create policy "admin_all_stripe_settings"
on public.stripe_settings for all
to authenticated
using (true)
with check (true);

drop policy if exists "admin_all_stripe_checkout_sessions" on public.stripe_checkout_sessions;
create policy "admin_all_stripe_checkout_sessions"
on public.stripe_checkout_sessions for all
to authenticated
using (true)
with check (true);
