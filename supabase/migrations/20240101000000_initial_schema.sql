-- Habilitar extensión para UUIDs
create extension if not exists "pgcrypto";

-- Clientes
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  notes text,
  created_at timestamptz default now()
);

-- Órdenes de cobro
create table orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  concept text not null,
  description text,
  total_amount numeric(12,2) not null check (total_amount > 0),
  paid_amount numeric(12,2) default 0,
  status text default 'pending' check (status in ('pending', 'partial', 'completed')),
  token uuid default gen_random_uuid() unique not null,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Pagos / abonos
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade not null,
  amount numeric(12,2) not null check (amount > 0),
  concept text not null,
  notes text,
  created_at timestamptz default now()
);

-- Trigger: actualizar paid_amount y status en orders después de insertar un pago
create or replace function update_order_on_payment()
returns trigger as $$
declare
  total_paid numeric;
  order_total numeric;
  target_order_id uuid;
begin
  target_order_id := COALESCE(NEW.order_id, OLD.order_id);

  select sum(amount) into total_paid
  from payments
  where order_id = target_order_id;

  select total_amount into order_total
  from orders
  where id = target_order_id;

  update orders
  set
    paid_amount = COALESCE(total_paid, 0),
    status = case
      when COALESCE(total_paid, 0) <= 0 then 'pending'
      when COALESCE(total_paid, 0) < order_total then 'partial'
      else 'completed'
    end,
    completed_at = case
      when COALESCE(total_paid, 0) >= order_total then now()
      else null
    end
  where id = target_order_id;

  return COALESCE(NEW, OLD);
end;
$$ language plpgsql;

create trigger after_payment_insert
after insert on payments
for each row execute function update_order_on_payment();

create trigger after_payment_delete
after delete on payments
for each row execute function update_order_on_payment();

-- RLS
alter table clients enable row level security;
alter table orders enable row level security;
alter table payments enable row level security;

-- Política pública: lectura de órdenes por token
create policy "public_read_order_by_token"
on orders for select
to anon
using (token is not null);

create policy "public_read_payments_by_order"
on payments for select
to anon
using (
  exists (
    select 1 from orders
    where orders.id = payments.order_id
  )
);

create policy "public_read_client_by_order"
on clients for select
to anon
using (
  exists (
    select 1 from orders
    where orders.client_id = clients.id
  )
);
