begin;

-- Public guests are assertions, not verified CRM identities. Preserve historical
-- links visibly for review; never silently delete/reassign existing relationships.
alter table public.calendar_bookings alter column client_id drop not null;
alter table public.calendar_bookings
 add column contact_link_status text not null default 'unverified'
   check (contact_link_status in ('unverified','legacy_unverified','approved')),
 add column contact_approved_by uuid references auth.users(id),
 add column contact_approved_at timestamptz,
 add column recovery_attempts integer not null default 0 check (recovery_attempts >= 0),
 add column next_retry_at timestamptz default now(),
 add column recovery_review_required boolean not null default false,
 add column last_sync_error text check (last_sync_error in ('sync_failed','cancel_failed','lease_expired','dependency_unavailable')),
 add column sync_claim_token uuid;
update public.calendar_bookings set contact_link_status='legacy_unverified' where client_id is not null;
alter table public.calendar_bookings add constraint booking_contact_approval_check check (
 (contact_link_status='unverified' and client_id is null and contact_approved_by is null and contact_approved_at is null)
 or (contact_link_status='legacy_unverified' and client_id is not null and contact_approved_by is null and contact_approved_at is null)
 or (contact_link_status='approved' and client_id is not null and contact_approved_by is not null and contact_approved_by=owner_user_id and contact_approved_at is not null)
);
create index calendar_bookings_recovery_due on public.calendar_bookings(next_retry_at,created_at)
 where not recovery_review_required and status in ('pending','sync_failed','cancelling');

create or replace function public.reserve_calendar_booking(p_event_type uuid,p_start timestamptz,p_name text,p_email text,p_phone text,p_notes text,p_key uuid,p_hash text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare e public.booking_event_types; b public.calendar_bookings; finish timestamptz;
begin
 select * into e from public.booking_event_types where id=p_event_type and enabled;
 if e.id is null then raise exception 'booking_unavailable'; end if;
 if not exists(select 1 from public.app_admin_users where user_id=e.owner_user_id) then raise exception 'booking_unavailable'; end if;
 perform pg_advisory_xact_lock(hashtextextended(e.owner_user_id::text,0));
 select * into b from public.calendar_bookings where idempotency_key=p_key;
 if b.id is not null then
   if b.request_hash<>p_hash or b.event_type_id<>p_event_type then raise exception 'idempotency_conflict'; end if;
   return to_jsonb(b);
 end if;
 if p_start is null or p_name is null or length(trim(p_name)) not between 1 and 120
 or p_email is null or length(p_email) not between 3 and 254
 or p_key is null or p_hash is null or length(p_hash) not between 1 and 128
 or length(coalesce(p_phone,''))>30 or length(coalesce(p_notes,''))>1500 then raise exception 'invalid_booking_input'; end if;
 if p_start < now()+make_interval(hours=>e.notice_hours) or p_start > now()+make_interval(days=>e.horizon_days) then raise exception 'invalid_time'; end if;
 finish := p_start+make_interval(mins=>e.duration_minutes);
 if extract(isodow from p_start at time zone e.timezone)::integer <> all(e.weekdays)
 or p_start at time zone e.timezone < date_trunc('day',p_start at time zone e.timezone)+make_interval(hours=>e.start_hour)
 or finish at time zone e.timezone > date_trunc('day',p_start at time zone e.timezone)+make_interval(hours=>e.end_hour)
 then raise exception 'outside_availability'; end if;
 -- Do not look up or create a contact using an unverified public email address.
 insert into public.calendar_bookings(owner_user_id,event_type_id,guest_name,guest_email,guest_phone,notes,starts_at,ends_at,occupied_range,idempotency_key,request_hash)
 values(e.owner_user_id,e.id,p_name,lower(p_email),p_phone,coalesce(p_notes,''),p_start,finish,
 tstzrange(p_start-make_interval(mins=>e.buffer_minutes),finish+make_interval(mins=>e.buffer_minutes),'[)'),p_key,p_hash) returning * into b;
 return to_jsonb(b);
end $$;

create function public.approve_calendar_booking_contact(p_booking uuid,p_owner uuid,p_client uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare b public.calendar_bookings;
begin
 if not exists(select 1 from public.app_admin_users where user_id=p_owner) then raise exception 'booking_forbidden' using errcode='42501'; end if;
 select * into b from public.calendar_bookings where id=p_booking and owner_user_id=p_owner for update;
 if b.id is null then raise exception 'booking_forbidden' using errcode='42501'; end if;
 perform 1 from public.clients where id=p_client for key share;
 if not found then raise exception 'booking_client_not_found'; end if;
 if b.contact_link_status='approved' then
   if b.client_id=p_client then return; end if;
   raise exception 'booking_contact_already_approved';
 end if;
 update public.calendar_bookings set client_id=p_client,contact_link_status='approved',contact_approved_by=p_owner,contact_approved_at=now() where id=b.id;
end $$;

-- Claims fence older workers; concurrent/manual retries cannot repeat Google work.
create function public.claim_calendar_booking_work(p_booking uuid,p_owner uuid,p_operation text,p_manual boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare b public.calendar_bookings; starting_cancel boolean;
begin
 if p_operation is null or p_manual is null or p_operation not in ('sync','cancel') or not exists(select 1 from public.app_admin_users where user_id=p_owner) then raise exception 'booking_forbidden' using errcode='42501'; end if;
 select * into b from public.calendar_bookings where id=p_booking and owner_user_id=p_owner for update;
 if b.id is null then return null; end if;
 starting_cancel := p_operation='cancel' and b.status in ('pending','sync_failed','confirmed');
 if p_operation='sync' and b.status not in ('pending','sync_failed') then return null; end if;
 if p_operation='cancel' and not starting_cancel and b.status<>'cancelling' then return null; end if;
 -- A live cancellation lease also excludes a second manual cancellation.
 if b.sync_claim_token is not null then return null; end if;
 if not p_manual and not starting_cancel and (b.recovery_review_required or b.next_retry_at is null or b.next_retry_at>now()) then return null; end if;
 update public.calendar_bookings set
   status=case when p_operation='sync' then 'syncing' else 'cancelling' end,
   recovery_attempts=case when p_manual or starting_cancel then 1 else recovery_attempts+1 end,
   sync_claim_token=gen_random_uuid(),sync_started_at=now(),next_retry_at=null,
   recovery_review_required=false,last_sync_error=null
 where id=b.id returning * into b;
 return to_jsonb(b);
end $$;

create function public.finish_calendar_booking_work(p_booking uuid,p_claim uuid,p_success boolean,p_google_event_id text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare b public.calendar_bookings; review boolean;
begin
 select * into b from public.calendar_bookings where id=p_booking and sync_claim_token=p_claim for update;
 if b.id is null then return null; end if;
 if b.status not in ('syncing','cancelling') then raise exception 'invalid_booking_transition'; end if;
 if p_success and b.status='syncing' and (p_google_event_id is null or length(p_google_event_id)>1024) then raise exception 'invalid_google_event'; end if;
 review := not p_success and b.recovery_attempts>=5;
 update public.calendar_bookings set
  status=case when p_success then case when b.status='syncing' then 'confirmed' else 'cancelled' end else case when b.status='syncing' then 'sync_failed' else 'cancelling' end end,
  google_event_id=case when p_success and b.status='syncing' then p_google_event_id else google_event_id end,
  sync_claim_token=null,sync_started_at=null,recovery_review_required=review,
  last_sync_error=case when p_success then null when b.status='syncing' then 'sync_failed' else 'cancel_failed' end,
  next_retry_at=case when p_success or review then null else now()+make_interval(mins=>least(60,power(2,least(b.recovery_attempts,6))::integer)) end
 where id=b.id returning * into b;
 return to_jsonb(b);
end $$;

create function public.reap_calendar_booking_leases()
returns integer language plpgsql security invoker set search_path='' as $$
declare n integer; quarantined integer;
begin
 update public.calendar_bookings set
 status=case when status='syncing' then 'sync_failed' else 'cancelling' end,
 sync_claim_token=null,sync_started_at=null,last_sync_error='lease_expired',
 recovery_review_required=recovery_attempts>=5,
 next_retry_at=case when recovery_attempts>=5 then null else now()+interval '2 minutes' end
 where status in ('syncing','cancelling') and sync_started_at<now()-interval '15 minutes';
 get diagnostics n=row_count;
 -- Inactive owners cannot execute provider work; quarantine rather than leaving
 -- their oldest ten jobs at the head of every recovery batch.
 update public.calendar_bookings b set recovery_review_required=true,next_retry_at=null,last_sync_error='dependency_unavailable'
 where status in ('pending','sync_failed','cancelling') and sync_claim_token is null and not recovery_review_required
 and not exists(select 1 from public.app_admin_users a where a.user_id=b.owner_user_id);
 get diagnostics quarantined=row_count;
 return n+quarantined;
end $$;

revoke all on function public.reserve_calendar_booking(uuid,timestamptz,text,text,text,text,uuid,text) from public,anon,authenticated;
revoke all on function public.approve_calendar_booking_contact(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.claim_calendar_booking_work(uuid,uuid,text,boolean) from public,anon,authenticated;
revoke all on function public.finish_calendar_booking_work(uuid,uuid,boolean,text) from public,anon,authenticated;
revoke all on function public.reap_calendar_booking_leases() from public,anon,authenticated;
grant execute on function public.reserve_calendar_booking(uuid,timestamptz,text,text,text,text,uuid,text) to service_role;
grant execute on function public.approve_calendar_booking_contact(uuid,uuid,uuid) to service_role;
grant execute on function public.claim_calendar_booking_work(uuid,uuid,text,boolean) to service_role;
grant execute on function public.finish_calendar_booking_work(uuid,uuid,boolean,text) to service_role;
grant execute on function public.reap_calendar_booking_leases() to service_role;
commit;
