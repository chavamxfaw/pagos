create table if not exists public.stripe_payment_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  amount numeric(12,2) not null check (amount > 0),
  concept text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'expired')),
  commission_payer text not null default 'merchant' check (commission_payer in ('merchant', 'customer')),
  fee_amount numeric(12,2) not null default 0,
  total_charged numeric(12,2) not null,
  requires_invoice boolean not null default false,
  tax_mode text not null default 'none' check (tax_mode in ('none', 'included', 'added')),
  notes text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stripe_checkout_sessions
  add column if not exists payment_request_id uuid references public.stripe_payment_requests(id) on delete set null;

create index if not exists stripe_payment_requests_order_id_created_at_idx
  on public.stripe_payment_requests(order_id, created_at desc);

create index if not exists stripe_payment_requests_status_idx
  on public.stripe_payment_requests(status);

create index if not exists stripe_checkout_sessions_payment_request_id_idx
  on public.stripe_checkout_sessions(payment_request_id);

alter table public.stripe_payment_requests enable row level security;

drop policy if exists "admin_all_stripe_payment_requests" on public.stripe_payment_requests;
create policy "admin_all_stripe_payment_requests"
on public.stripe_payment_requests for all
to authenticated
using (true)
with check (true);
