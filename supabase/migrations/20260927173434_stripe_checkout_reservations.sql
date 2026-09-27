-- Reserve before external side effects. Order lock serializes reservation vs cancellation.
create function public.reserve_stripe_checkout(p_order uuid,p_request uuid,p_amount numeric,p_fee numeric,p_total numeric,p_metadata jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare o public.orders; r public.stripe_payment_requests; c public.stripe_checkout_sessions; new_id uuid := gen_random_uuid();
begin
  select * into o from public.orders where id=p_order for update;
  if o.id is null or o.status in ('cancelled','completed') or o.paid_amount>=o.total_amount then
    raise exception 'Order unavailable for checkout';
  end if;
  select * into r from public.stripe_payment_requests where id=p_request and order_id=p_order for update;
  if r.id is null or r.status<>'pending' or r.client_id<>o.client_id then raise exception 'Payment request unavailable'; end if;
  select * into c from public.stripe_checkout_sessions where payment_request_id=p_request and status in ('pending','paid') order by created_at desc limit 1;
  if c.id is not null then return to_jsonb(c); end if;
  if p_amount<=0 or p_amount>o.total_amount-o.paid_amount or p_fee<0 or p_total<p_amount then raise exception 'Invalid checkout amount'; end if;
  insert into public.stripe_checkout_sessions(id,order_id,client_id,payment_request_id,stripe_session_id,amount,fee_amount,total_charged,commission_payer,metadata)
  values(new_id,o.id,o.client_id,r.id,'creating:'||new_id,p_amount,p_fee,p_total,r.commission_payer,p_metadata) returning * into c;
  return to_jsonb(c);
end $$;
revoke all on function public.reserve_stripe_checkout(uuid,uuid,numeric,numeric,numeric,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_stripe_checkout(uuid,uuid,numeric,numeric,numeric,jsonb) to service_role;

create function public.guard_order_stripe_cancellation() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.status='cancelled' and old.status is distinct from 'cancelled' and exists (
    select 1 from public.stripe_checkout_sessions where order_id=old.id and status='pending'
  ) then raise exception 'Expire or reconcile pending Stripe checkouts before cancellation'; end if;
  return new;
end $$;
create trigger guard_order_stripe_cancellation before update of status on public.orders for each row execute function public.guard_order_stripe_cancellation();
revoke all on function public.guard_order_stripe_cancellation() from public,anon,authenticated;
