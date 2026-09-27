-- Commercial account inventory only. Does not grant tenant sign-in or data access.
create table public.platform_accounts (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id),
 name text not null check (length(trim(name)) between 1 and 160),
 status text not null default 'trial' check (status in ('trial','active','suspended','cancelled')),
 plan text not null check (length(trim(plan)) between 1 and 80),
 contact_name text not null default '' check (length(contact_name) <= 160),
 contact_email text not null default '' check (length(contact_email) <= 254),
 notes text not null default '' check (length(notes) <= 5000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.platform_accounts enable row level security;
revoke all on table public.platform_accounts from anon, authenticated;
grant select, insert, update, delete on table public.platform_accounts to service_role;
create index platform_accounts_owner_status_idx on public.platform_accounts(owner_user_id, status);
-- No authenticated policies: server checks PLATFORM_OWNER_USER_ID explicitly.

create table public.crm_proposals (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id),
 client_id uuid references public.clients(id) on delete set null,
 title text not null check (length(trim(title)) between 1 and 160),
 notes text not null default '' check (length(notes) <= 5000),
 status text not null default 'draft' check (status in ('draft','sent','accepted','rejected')),
 due_date date,
 budget_amount numeric(12,2) not null default 0 check (budget_amount between 0 and 999999999),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.crm_renewals (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id),
 client_id uuid references public.clients(id) on delete set null,
 title text not null check (length(trim(title)) between 1 and 160),
 notes text not null default '' check (length(notes) <= 5000),
 status text not null default 'upcoming' check (status in ('upcoming','contacted','renewed','cancelled')),
 due_date date,
 budget_amount numeric(12,2) not null default 0 check (budget_amount between 0 and 999999999),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
do $$
declare tab text;
begin
 foreach tab in array array['crm_proposals','crm_renewals'] loop
   execute format('alter table public.%I enable row level security', tab);
   execute format('revoke all on table public.%I from anon, authenticated', tab);
   execute format('grant select, insert, update, delete on table public.%I to authenticated', tab);
   execute format('grant all on table public.%I to service_role', tab);
   execute format('create policy owner_admin_access on public.%I for all to authenticated using (owner_user_id = (select auth.uid()) and exists (select 1 from public.app_admin_users where user_id = (select auth.uid()))) with check (owner_user_id = (select auth.uid()) and exists (select 1 from public.app_admin_users where user_id = (select auth.uid())))', tab);
   execute format('create index %I on public.%I(owner_user_id, status, due_date)', tab || '_owner_status_date_idx', tab);
   execute format('create index %I on public.%I(client_id)', tab || '_client_idx', tab);
 end loop;
end $$;
