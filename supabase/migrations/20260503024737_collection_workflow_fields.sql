alter table public.orders
  add column if not exists issued_at date not null default current_date,
  add column if not exists due_date date,
  add column if not exists cancelled_at timestamptz;

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'partial', 'completed', 'cancelled', 'paused', 'disputed'));

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('client', 'order', 'payment')),
  entity_id uuid not null,
  client_id uuid references public.clients(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  event_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_client_id_created_at_idx
  on public.activity_logs(client_id, created_at desc);

create index if not exists activity_logs_order_id_created_at_idx
  on public.activity_logs(order_id, created_at desc);

create table if not exists public.client_followups (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  note_type text not null default 'note' check (note_type in ('note', 'call', 'promise', 'reminder', 'invoice')),
  content text not null,
  follow_up_date date,
  created_at timestamptz not null default now()
);

create index if not exists client_followups_client_id_created_at_idx
  on public.client_followups(client_id, created_at desc);

alter table public.activity_logs enable row level security;
alter table public.client_followups enable row level security;

create policy "admin_all_activity_logs"
on public.activity_logs for all
to authenticated
using (true)
with check (true);

create policy "admin_all_client_followups"
on public.client_followups for all
to authenticated
using (true)
with check (true);

create or replace function public.update_order_on_payment()
returns trigger as $$
declare
  total_paid numeric;
  order_total numeric;
  target_order_id uuid;
  current_status text;
begin
  target_order_id := COALESCE(NEW.order_id, OLD.order_id);

  select sum(amount) into total_paid
  from public.payments
  where order_id = target_order_id;

  select total_amount, status into order_total, current_status
  from public.orders
  where id = target_order_id;

  update public.orders
  set
    paid_amount = COALESCE(total_paid, 0),
    status = case
      when current_status in ('cancelled', 'paused', 'disputed') then current_status
      when COALESCE(total_paid, 0) <= 0 then 'pending'
      when COALESCE(total_paid, 0) < order_total then 'partial'
      else 'completed'
    end,
    completed_at = case
      when current_status in ('cancelled', 'paused', 'disputed') then completed_at
      when COALESCE(total_paid, 0) >= order_total then COALESCE(completed_at, now())
      else null
    end
  where id = target_order_id;

  return COALESCE(NEW, OLD);
end;
$$ language plpgsql;

drop trigger if exists after_payment_update on public.payments;

create trigger after_payment_update
after update on public.payments
for each row execute function public.update_order_on_payment();
