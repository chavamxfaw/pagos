-- Minimal synthetic schema for the network-isolated calendar regression container.
-- Never run against an existing Supabase database.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema extensions;
create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public,auth,extensions to anon,authenticated,service_role;
create table public.app_admin_users(user_id uuid primary key references auth.users(id));
create table public.clients(id uuid primary key default gen_random_uuid(),name text not null,email text not null,phone text,created_at timestamptz default now());
grant all on public.app_admin_users,public.clients to service_role;
grant select on public.app_admin_users to authenticated;
