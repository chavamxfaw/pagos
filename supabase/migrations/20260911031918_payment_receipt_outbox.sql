create table public.payment_receipt_deliveries (
  payment_id uuid not null references public.payments(id) on delete cascade,
  channel text not null check(channel in ('email','whatsapp')),
  status text not null default 'pending' check(status in ('pending','sending','sent','skipped','unknown')),
  provider_id text,
  updated_at timestamptz not null default now(),
  primary key(payment_id,channel)
);
alter table public.payment_receipt_deliveries enable row level security;
revoke all on public.payment_receipt_deliveries from anon,authenticated;
grant all on public.payment_receipt_deliveries to service_role;
create function public.enqueue_payment_receipt() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.payment_receipt_deliveries(payment_id,channel) values(new.id,'email'),(new.id,'whatsapp');
  return new;
end $$;
-- Trigger-only function: authenticated writers cannot call privileged helpers directly.
revoke all on function public.enqueue_payment_receipt() from public,anon,authenticated;
create trigger enqueue_payment_receipt after insert on public.payments
for each row execute function public.enqueue_payment_receipt();
create index payment_receipt_deliveries_pending on public.payment_receipt_deliveries(updated_at) where status='pending';
