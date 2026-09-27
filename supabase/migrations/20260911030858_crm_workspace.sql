-- Personal CRM. Membership in the existing admin allowlist is mandatory.
create table public.crm_opportunities (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id),
 client_id uuid references public.clients(id) on delete set null,
 title text not null check (length(trim(title)) between 1 and 160),
 notes text not null default '' check (length(notes) <= 5000),
 status text not null default 'new' check (status in ('new','qualified','proposal','negotiation','won','lost')),
 due_date date,
 value_amount numeric(12,2) not null default 0 check (value_amount between 0 and 999999999),
 next_action text not null default '' check (length(next_action) <= 500),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.crm_projects (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id),
 client_id uuid references public.clients(id) on delete set null,
 title text not null check (length(trim(title)) between 1 and 160),
 notes text not null default '' check (length(notes) <= 5000),
 status text not null default 'planned' check (status in ('planned','active','paused','completed')),
 due_date date,
 budget_amount numeric(12,2) not null default 0 check (budget_amount between 0 and 999999999),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.crm_tasks (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id),
 client_id uuid references public.clients(id) on delete set null,
 title text not null check (length(trim(title)) between 1 and 160),
 notes text not null default '' check (length(notes) <= 5000),
 status text not null default 'pending' check (status in ('pending','in_progress','completed')),
 due_date date,
 priority text not null default 'normal' check (priority in ('low','normal','high')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
do $$
declare tab text;
begin
 foreach tab in array array['crm_opportunities','crm_projects','crm_tasks'] loop
   execute format('alter table public.%I enable row level security', tab);
   execute format('revoke all on table public.%I from anon, authenticated', tab);
   execute format('grant select, insert, update, delete on table public.%I to authenticated', tab);
   execute format('grant all on table public.%I to service_role', tab);
   execute format('create policy owner_admin_access on public.%I for all to authenticated using (owner_user_id = (select auth.uid()) and exists (select 1 from public.app_admin_users where user_id = (select auth.uid()))) with check (owner_user_id = (select auth.uid()) and exists (select 1 from public.app_admin_users where user_id = (select auth.uid())))', tab);
   execute format('create index %I on public.%I(owner_user_id, status, due_date)', tab || '_owner_status_date_idx', tab);
   execute format('create index %I on public.%I(client_id)', tab || '_client_idx', tab);
 end loop;
end $$;
