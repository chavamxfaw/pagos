alter table public.payments
  add column if not exists paid_at date not null default current_date;

create index if not exists payments_paid_at_idx
  on public.payments(paid_at desc);
