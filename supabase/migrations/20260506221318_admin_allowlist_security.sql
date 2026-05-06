create table if not exists public.app_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admin_users enable row level security;

insert into public.app_admin_users (user_id)
select id
from auth.users
on conflict (user_id) do nothing;

drop policy if exists "authenticated_read_own_admin_membership" on public.app_admin_users;
create policy "authenticated_read_own_admin_membership"
on public.app_admin_users for select
to authenticated
using (user_id = (select auth.uid()));

create or replace function public.update_order_on_payment()
returns trigger
set search_path = public
as $$
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

drop policy if exists "admin_all_activity_logs" on public.activity_logs;
drop policy if exists "admin_all_bank_accounts" on public.bank_accounts;
drop policy if exists "admin_all_client_followups" on public.client_followups;
drop policy if exists "admin_all_clients" on public.clients;
drop policy if exists "admin_all_fiscal_documents" on public.fiscal_documents;
drop policy if exists "authenticated_read_fiscal_documents" on public.fiscal_documents;
drop policy if exists "admin_all_orders" on public.orders;
drop policy if exists "admin_all_payments" on public.payments;
drop policy if exists "admin_all_stripe_checkout_sessions" on public.stripe_checkout_sessions;
drop policy if exists "admin_all_stripe_payment_requests" on public.stripe_payment_requests;
drop policy if exists "admin_all_stripe_settings" on public.stripe_settings;

create policy "admin_all_activity_logs"
on public.activity_logs for all
to authenticated
using (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())))
with check (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())));

create policy "admin_all_bank_accounts"
on public.bank_accounts for all
to authenticated
using (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())))
with check (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())));

create policy "admin_all_client_followups"
on public.client_followups for all
to authenticated
using (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())))
with check (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())));

create policy "admin_all_clients"
on public.clients for all
to authenticated
using (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())))
with check (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())));

create policy "admin_select_fiscal_documents"
on public.fiscal_documents for select
to authenticated
using (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())));

create policy "admin_all_orders"
on public.orders for all
to authenticated
using (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())))
with check (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())));

create policy "admin_all_payments"
on public.payments for all
to authenticated
using (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())))
with check (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())));

create policy "admin_all_stripe_checkout_sessions"
on public.stripe_checkout_sessions for all
to authenticated
using (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())))
with check (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())));

create policy "admin_all_stripe_payment_requests"
on public.stripe_payment_requests for all
to authenticated
using (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())))
with check (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())));

create policy "admin_all_stripe_settings"
on public.stripe_settings for all
to authenticated
using (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())))
with check (exists (select 1 from public.app_admin_users where user_id = (select auth.uid())));

drop policy if exists "users_own_settings" on public.user_settings;
create policy "users_own_settings"
on public.user_settings for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create index if not exists activity_logs_payment_id_idx on public.activity_logs(payment_id);
create index if not exists stripe_checkout_sessions_client_id_idx on public.stripe_checkout_sessions(client_id);
create index if not exists stripe_payment_requests_client_id_idx on public.stripe_payment_requests(client_id);
