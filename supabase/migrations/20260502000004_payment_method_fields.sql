alter table payments
  add column if not exists payment_method text default 'transfer' not null
    check (payment_method in ('cash', 'transfer', 'card', 'check', 'other')),
  add column if not exists payment_reference text;
