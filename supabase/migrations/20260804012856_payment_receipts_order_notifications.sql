alter table public.orders
  add column if not exists notify_email_enabled boolean not null default true,
  add column if not exists notify_whatsapp_enabled boolean not null default true;

alter table public.payments
  add column if not exists receipt_token text,
  add column if not exists receipt_issued_at timestamptz not null default now();

update public.payments
set receipt_token = gen_random_uuid()::text
where receipt_token is null;

alter table public.payments
  alter column receipt_token set not null,
  alter column receipt_token set default gen_random_uuid()::text;

create unique index if not exists payments_receipt_token_idx
  on public.payments(receipt_token);

alter table public.payments
  drop constraint if exists payments_payment_method_check,
  add constraint payments_payment_method_check
    check (payment_method in ('cash', 'transfer', 'card', 'stripe', 'check', 'other'));
