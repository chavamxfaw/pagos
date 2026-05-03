alter table public.orders
add column if not exists bank_account_id uuid references public.bank_accounts(id) on delete set null;

create index if not exists orders_bank_account_id_idx
on public.orders(bank_account_id);
