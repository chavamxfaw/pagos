create or replace function update_order_on_payment()
returns trigger
set search_path = public
as $$
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

create index if not exists orders_client_id_idx on orders(client_id);
create index if not exists payments_order_id_idx on payments(order_id);
