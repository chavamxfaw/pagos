alter table public.orders
  add column if not exists payment_reminder_enabled boolean not null default false,
  add column if not exists payment_reminder_days_before integer not null default 1,
  add column if not exists payment_reminder_last_sent_on date;

alter table public.orders
  drop constraint if exists orders_payment_reminder_days_before_check,
  add constraint orders_payment_reminder_days_before_check
    check (payment_reminder_days_before between 0 and 30);

create index if not exists orders_payment_reminder_due_idx
on public.orders(due_date, payment_reminder_enabled, payment_reminder_last_sent_on)
where payment_reminder_enabled = true;
