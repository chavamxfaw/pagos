create extension if not exists btree_gist with schema extensions;
create table public.calendar_connections (
 id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users(id),
 account_email text not null, refresh_token_encrypted text not null, created_at timestamptz not null default now(),
 unique(owner_user_id,account_email)
);
alter table public.calendar_connections enable row level security;
revoke all on public.calendar_connections from anon, authenticated;
grant all on public.calendar_connections to service_role;

create table public.connected_calendars (
 id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users(id),
 connection_id uuid not null references public.calendar_connections(id) on delete cascade,
 google_calendar_id text not null, name text not null, access_role text not null,
 blocks_availability boolean not null default true, unique(connection_id,google_calendar_id), unique(owner_user_id,id)
);
create table public.booking_event_types (
 id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users(id),
 slug text not null unique default gen_random_uuid()::text, title text not null check(length(title) between 1 and 120),
 description text not null default '', duration_minutes integer not null default 30 check(duration_minutes between 15 and 240),
 buffer_minutes integer not null default 15 check(buffer_minutes between 0 and 120),
 notice_hours integer not null default 12 check(notice_hours between 0 and 720),
 horizon_days integer not null default 30 check(horizon_days between 1 and 90),
 timezone text not null default 'America/Monterrey', weekdays integer[] not null default '{1,2,3,4,5}',
 start_hour integer not null default 9 check(start_hour between 0 and 23),
 end_hour integer not null default 18 check(end_hour between 1 and 24 and end_hour > start_hour),
 destination_calendar_id uuid not null,
 enabled boolean not null default true,
 foreign key(owner_user_id,destination_calendar_id) references public.connected_calendars(owner_user_id,id)
);
create table public.calendar_bookings (
 id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users(id),
 event_type_id uuid not null references public.booking_event_types(id), client_id uuid not null references public.clients(id),
 guest_name text not null, guest_email text not null, guest_phone text, notes text not null default '',
 starts_at timestamptz not null, ends_at timestamptz not null check(ends_at > starts_at),
 occupied_range tstzrange not null, status text not null default 'pending' check(status in ('pending','syncing','confirmed','sync_failed','cancelling','cancelled')),
 idempotency_key uuid not null unique, request_hash text not null, management_token uuid not null unique default gen_random_uuid(),
 google_event_id text, sync_started_at timestamptz, created_at timestamptz not null default now(),
 exclude using gist (owner_user_id with =, occupied_range with &&) where (status <> 'cancelled')
);
create index calendar_bookings_client on public.calendar_bookings(client_id, starts_at);
create index calendar_bookings_owner on public.calendar_bookings(owner_user_id, starts_at);
do $$ declare t text; begin
 foreach t in array array['connected_calendars','booking_event_types','calendar_bookings'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('create policy owner_read on public.%I for select to authenticated using (owner_user_id = (select auth.uid()) and exists(select 1 from public.app_admin_users where user_id=(select auth.uid())))',t);
 end loop;
end $$;

create function public.reserve_calendar_booking(p_event_type uuid,p_start timestamptz,p_name text,p_email text,p_phone text,p_notes text,p_key uuid,p_hash text)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare e public.booking_event_types; b public.calendar_bookings; cid uuid; finish timestamptz;
begin
 select * into e from public.booking_event_types where id=p_event_type and enabled;
 if e.id is null then raise exception 'booking_unavailable'; end if;
 perform pg_advisory_xact_lock(hashtextextended(e.owner_user_id::text,0));
 select * into b from public.calendar_bookings where idempotency_key=p_key;
 if b.id is not null then
   if b.request_hash<>p_hash then raise exception 'idempotency_conflict'; end if;
   return to_jsonb(b);
 end if;
 if p_start < now()+make_interval(hours=>e.notice_hours) or p_start > now()+make_interval(days=>e.horizon_days) then raise exception 'invalid_time'; end if;
 finish := p_start+make_interval(mins=>e.duration_minutes);
 if extract(isodow from p_start at time zone e.timezone)::integer <> all(e.weekdays)
 or extract(hour from p_start at time zone e.timezone)<e.start_hour
 or (finish at time zone e.timezone)::time > make_time(e.end_hour % 24,0,0) and e.end_hour<>24
 then raise exception 'outside_availability'; end if;
 select id into cid from public.clients where lower(email)=lower(p_email) order by created_at limit 1;
 if cid is null then
  insert into public.clients(name,email,phone) values(p_name,lower(p_email),nullif(p_phone,'')) returning id into cid;
 end if;
 insert into public.calendar_bookings(owner_user_id,event_type_id,client_id,guest_name,guest_email,guest_phone,notes,starts_at,ends_at,occupied_range,idempotency_key,request_hash)
 values(e.owner_user_id,e.id,cid,p_name,lower(p_email),p_phone,p_notes,p_start,finish,
 tstzrange(p_start-make_interval(mins=>e.buffer_minutes),finish+make_interval(mins=>e.buffer_minutes),'[)'),p_key,p_hash) returning * into b;
 return to_jsonb(b);
end $$;
revoke all on function public.reserve_calendar_booking(uuid,timestamptz,text,text,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_calendar_booking(uuid,timestamptz,text,text,text,text,uuid,text) to service_role;
