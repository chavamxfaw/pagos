create table if not exists public.admin_notification_dismissals (
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id text not null,
  fingerprint text not null,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

alter table public.admin_notification_dismissals enable row level security;

drop policy if exists "admin_manage_own_notification_dismissals" on public.admin_notification_dismissals;
create policy "admin_manage_own_notification_dismissals"
on public.admin_notification_dismissals for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (select 1 from public.app_admin_users where user_id = (select auth.uid()))
)
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.app_admin_users where user_id = (select auth.uid()))
);
