-- Single-owner transactional services. No public or authenticated RPC access.
create table public.payment_operations (
  operation_key text primary key,
  payload jsonb not null,
  payment_id uuid not null references public.payments(id),
  created_at timestamptz not null default now()
);
alter table public.payment_operations enable row level security;
revoke all on public.payment_operations from anon, authenticated;
grant all on public.payment_operations to service_role;

-- Serialize every payment writer, including existing dashboard actions.
create function public.guard_payment_balance() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare o public.orders; paid numeric;
begin
  if tg_op = 'UPDATE' and new.order_id <> old.order_id then
    raise exception 'A payment cannot change order';
  end if;
  select * into o from public.orders where id = coalesce(new.order_id, old.order_id) for update;
  if tg_op = 'DELETE' then return old; end if;
  if o.id is null or o.status in ('cancelled', 'completed') and tg_op = 'INSERT' then
    raise exception 'Order does not accept payments';
  end if;
  select coalesce(sum(amount), 0) into paid from public.payments
    where order_id = new.order_id and id <> new.id;
  if new.amount <= 0 or paid + new.amount > o.total_amount then
    raise exception 'Payment exceeds outstanding balance';
  end if;
  return new;
end $$;
create trigger guard_payment_balance before insert or update or delete on public.payments
for each row execute function public.guard_payment_balance();

create function public.record_agent_payment(p_key text, p_actor uuid, p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare existing public.payment_operations; pay public.payments; o public.orders;
begin
  if not exists(select 1 from public.app_admin_users where user_id = p_actor) then
    raise exception 'Unauthorized';
  end if;
  if p_key is null or length(p_key) not between 16 and 128 then raise exception 'Invalid idempotency key'; end if;
  perform pg_advisory_xact_lock(hashtextextended('agent-payment:' || p_actor || ':' || p_key, 0));
  select * into existing from public.payment_operations where operation_key = 'agent:' || p_actor || ':' || p_key;
  if found then
    if existing.payload <> p_payload then raise exception 'Idempotency key already used with different data'; end if;
    select * into pay from public.payments where id = existing.payment_id;
    return jsonb_build_object('payment', to_jsonb(pay), 'replayed', true);
  end if;
  select * into o from public.orders where id = (p_payload->>'order_id')::uuid for update;
  if o.id is null then raise exception 'Order not found'; end if;
  insert into public.payments(order_id,amount,concept,payment_method,payment_reference,notes,paid_at)
  values(o.id,(p_payload->>'amount')::numeric,p_payload->>'concept',p_payload->>'payment_method',
    p_payload->>'payment_reference',p_payload->>'notes',(p_payload->>'paid_at')::date) returning * into pay;
  insert into public.payment_operations(operation_key,payload,payment_id)
    values('agent:' || p_actor || ':' || p_key,p_payload,pay.id);
  return jsonb_build_object('payment',to_jsonb(pay),'replayed',false);
end $$;
revoke all on function public.record_agent_payment(text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.record_agent_payment(text,uuid,jsonb) to service_role;

create function public.complete_stripe_checkout(p_session text,p_intent text,p_total numeric,p_currency text,p_paid_at date)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare checkout public.stripe_checkout_sessions; pay public.payments; o public.orders;
  existing public.payment_operations; req public.stripe_payment_requests;
begin
  select * into checkout from public.stripe_checkout_sessions where stripe_session_id = p_session for update;
  if checkout.id is null then raise exception 'Unknown Stripe checkout'; end if;
  if p_currency is distinct from 'mxn' or p_total is distinct from checkout.total_charged then
    raise exception 'Stripe amount or currency mismatch';
  end if;
  select * into existing from public.payment_operations where operation_key = 'stripe:' || p_session;
  if found then
    select * into pay from public.payments where id = existing.payment_id;
    return jsonb_build_object('payment',to_jsonb(pay),'checkout',to_jsonb(checkout),'replayed',true);
  end if;
  -- Do not silently acknowledge a legacy partial failure (paid checkout without ledger entry).
  if checkout.status = 'paid' then
    select * into pay from public.payments where order_id=checkout.order_id
      and payment_reference=coalesce(checkout.stripe_payment_intent_id,p_session)
      and payment_method in ('stripe','card') limit 1;
    if pay.id is null then raise exception 'Legacy Stripe checkout needs reconciliation'; end if;
    return jsonb_build_object('payment',to_jsonb(pay),'checkout',to_jsonb(checkout),'replayed',true);
  end if;
  if checkout.status <> 'pending' then raise exception 'Stripe checkout needs reconciliation'; end if;
  select * into o from public.orders where id = checkout.order_id for update;
  if checkout.client_id <> o.client_id then raise exception 'Stripe client mismatch'; end if;
  if checkout.payment_request_id is not null then
    select * into req from public.stripe_payment_requests where id = checkout.payment_request_id for update;
    if req.status <> 'pending' or req.order_id <> o.id or req.client_id <> o.client_id then
      raise exception 'Stripe payment request needs reconciliation';
    end if;
  end if;
  insert into public.payments(order_id,amount,concept,payment_method,payment_reference,notes,paid_at)
    values(o.id,checkout.amount,'Pago con tarjeta Stripe','stripe',coalesce(p_intent,p_session),
      'Pago confirmado por Stripe.',p_paid_at) returning * into pay;
  update public.stripe_checkout_sessions set status='paid',stripe_payment_intent_id=p_intent,paid_at=now()
    where id=checkout.id returning * into checkout;
  update public.stripe_payment_requests set status='paid',paid_at=now(),updated_at=now() where id=checkout.payment_request_id;
  insert into public.payment_operations(operation_key,payload,payment_id)
    values('stripe:' || p_session,jsonb_build_object('session',p_session,'intent',p_intent,'total',p_total),pay.id);
  return jsonb_build_object('payment',to_jsonb(pay),'checkout',to_jsonb(checkout),'replayed',false);
end $$;
revoke all on function public.complete_stripe_checkout(text,text,numeric,text,date) from public, anon, authenticated;
grant execute on function public.complete_stripe_checkout(text,text,numeric,text,date) to service_role;

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  direction text not null check(direction in ('inbound','outbound')),
  phone text not null,
  body text not null default '',
  kind text not null default 'text',
  resource_id uuid,
  actor_id uuid references auth.users(id),
  idempotency_key text unique,
  request_hash text,
  provider_sid text unique,
  status text not null default 'pending',
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index whatsapp_messages_client_created on public.whatsapp_messages(client_id,created_at desc);
create index whatsapp_messages_phone_created on public.whatsapp_messages(phone,created_at desc);
alter table public.whatsapp_messages enable row level security;
revoke all on public.whatsapp_messages from anon,authenticated;
grant select on public.whatsapp_messages to authenticated;
grant all on public.whatsapp_messages to service_role;
create policy owner_read_messages on public.whatsapp_messages for select to authenticated
using(exists(select 1 from public.app_admin_users where user_id=(select auth.uid())));

-- Callbacks can arrive before the send HTTP response; retain them independently.
create table public.whatsapp_status_events (
  provider_sid text not null,
  status text not null,
  error_code text,
  created_at timestamptz not null default now(),
  primary key(provider_sid,status)
);
alter table public.whatsapp_status_events enable row level security;
revoke all on public.whatsapp_status_events from anon,authenticated;
grant all on public.whatsapp_status_events to service_role;

create function public.whatsapp_status_rank(p_status text) returns integer
language sql immutable security invoker set search_path='' as $$
 select case p_status when 'accepted' then 1 when 'queued' then 2 when 'sending' then 3 when 'sent' then 4
   when 'failed' then 5 when 'undelivered' then 5 when 'delivered' then 6 when 'read' then 7 else 0 end
$$;
create function public.apply_whatsapp_status(p_sid text,p_status text,p_error text) returns void
language plpgsql security invoker set search_path='' as $$
begin
  insert into public.whatsapp_status_events(provider_sid,status,error_code) values(p_sid,p_status,p_error)
  on conflict do nothing;
  update public.whatsapp_messages set status=p_status,error_code=p_error,updated_at=now()
  where provider_sid=p_sid and direction='outbound'
    and public.whatsapp_status_rank(status) <= public.whatsapp_status_rank(p_status);
end $$;
revoke all on function public.whatsapp_status_rank(text) from public,anon,authenticated;
grant execute on function public.whatsapp_status_rank(text) to service_role;
revoke all on function public.apply_whatsapp_status(text,text,text) from public,anon,authenticated;
grant execute on function public.apply_whatsapp_status(text,text,text) to service_role;
