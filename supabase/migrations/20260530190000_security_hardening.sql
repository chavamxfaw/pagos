-- Keep only one active Stripe payment request per order.
with ranked_requests as (
  select
    id,
    row_number() over (partition by order_id order by created_at desc, id desc) as rn
  from public.stripe_payment_requests
  where status = 'pending'
)
update public.stripe_payment_requests spr
set
  status = 'cancelled',
  updated_at = now()
from ranked_requests rr
where spr.id = rr.id
  and rr.rn > 1;

create unique index if not exists stripe_payment_requests_one_pending_per_order_idx
on public.stripe_payment_requests(order_id)
where status = 'pending';

-- Keep only one active Checkout Session per payment request.
with ranked_checkouts as (
  select
    id,
    row_number() over (partition by payment_request_id order by created_at desc, id desc) as rn
  from public.stripe_checkout_sessions
  where status = 'pending'
    and payment_request_id is not null
)
update public.stripe_checkout_sessions scs
set status = 'expired'
from ranked_checkouts rc
where scs.id = rc.id
  and rc.rn > 1;

create unique index if not exists stripe_checkout_sessions_one_pending_per_request_idx
on public.stripe_checkout_sessions(payment_request_id)
where status = 'pending'
  and payment_request_id is not null;
