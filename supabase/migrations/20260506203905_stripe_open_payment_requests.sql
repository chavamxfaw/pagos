alter table public.stripe_payment_requests
  add column if not exists request_type text not null default 'fixed',
  add column if not exists minimum_amount numeric(12, 2);

alter table public.stripe_payment_requests
  drop constraint if exists stripe_payment_requests_request_type_check,
  add constraint stripe_payment_requests_request_type_check
    check (request_type in ('fixed', 'open'));

alter table public.stripe_payment_requests
  drop constraint if exists stripe_payment_requests_amount_check;

alter table public.stripe_payment_requests
  alter column amount drop not null;

alter table public.stripe_payment_requests
  add constraint stripe_payment_requests_amount_by_type_check
    check (
      (request_type = 'fixed' and amount is not null and amount > 0)
      or
      (request_type = 'open' and amount is null)
    );

alter table public.stripe_payment_requests
  add constraint stripe_payment_requests_minimum_amount_check
    check (minimum_amount is null or minimum_amount >= 1);

create unique index if not exists stripe_payment_requests_one_pending_per_order_idx
  on public.stripe_payment_requests(order_id)
  where status = 'pending';
