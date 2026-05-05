create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "users_own_settings"
  on public.user_settings for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Valor inicial para el usuario principal
insert into public.user_settings (user_id, display_name)
select id, 'Salvador Cervantes'
from auth.users
where email = 'chava.cervantes@gmail.com'
on conflict (user_id) do update set display_name = excluded.display_name;
