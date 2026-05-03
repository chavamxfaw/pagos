create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  alias text not null,
  bank_name text not null,
  account_holder text not null,
  clabe text,
  account_number text,
  card_number text,
  instructions text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bank_accounts enable row level security;

drop policy if exists "admin_all_bank_accounts" on public.bank_accounts;
create policy "admin_all_bank_accounts"
on public.bank_accounts for all
to authenticated
using (true)
with check (true);

create index if not exists bank_accounts_active_idx
on public.bank_accounts (is_active, created_at desc);
