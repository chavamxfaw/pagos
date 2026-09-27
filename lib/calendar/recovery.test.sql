\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values ('74000000-0000-0000-0000-000000000001','recovery@example.invalid');
insert into public.app_admin_users(user_id) values ('74000000-0000-0000-0000-000000000001');
insert into public.calendar_connections(id,owner_user_id,account_email,refresh_token_encrypted) values ('74000000-0000-0000-0000-000000000002','74000000-0000-0000-0000-000000000001','recovery@example.invalid','fixture');
insert into public.connected_calendars(id,owner_user_id,connection_id,google_calendar_id,name,access_role) values ('74000000-0000-0000-0000-000000000003','74000000-0000-0000-0000-000000000001','74000000-0000-0000-0000-000000000002','fixture','Fixture','owner');
insert into public.booking_event_types(id,owner_user_id,title,destination_calendar_id,weekdays,notice_hours,start_hour,end_hour,timezone,buffer_minutes) values ('74000000-0000-0000-0000-000000000004','74000000-0000-0000-0000-000000000001','Fixture','74000000-0000-0000-0000-000000000003',array[1,2,3,4,5,6,7],0,0,24,'UTC',0);
set local role service_role;
do $$ declare b jsonb; c jsonb; saved jsonb; stale uuid; last_id uuid; n integer; i integer; attempt integer; t timestamptz:=date_trunc('day',now())+interval '2 days'; begin
 for i in 1..11 loop
  b:=public.reserve_calendar_booking('74000000-0000-0000-0000-000000000004',t+make_interval(hours=>i),'Guest','unverified@example.invalid','','',gen_random_uuid(),'fixture');
  if i=11 then last_id:=(b->>'id')::uuid; continue; end if;
  for attempt in 1..5 loop
   c:=public.claim_calendar_booking_work((b->>'id')::uuid,'74000000-0000-0000-0000-000000000001','sync',false);
   assert c is not null,'due job not claimed';
   assert public.claim_calendar_booking_work((b->>'id')::uuid,'74000000-0000-0000-0000-000000000001','sync',true) is null,'live worker duplicated';
   saved:=public.finish_calendar_booking_work((b->>'id')::uuid,(c->>'sync_claim_token')::uuid,false);
   assert saved->>'status'='sync_failed','lost failure state';
   if attempt<5 then
    assert (saved->>'next_retry_at')::timestamptz>now(),'missing backoff';
    assert public.claim_calendar_booking_work((b->>'id')::uuid,'74000000-0000-0000-0000-000000000001','sync',false) is null,'backoff bypassed';
    update public.calendar_bookings set next_retry_at=now()-interval '1 second' where id=(b->>'id')::uuid;
   else
    assert (saved->>'recovery_review_required')::boolean and saved->>'next_retry_at' is null,'missing review queue';
   end if;
  end loop;
 end loop;
 select count(*) into n from public.calendar_bookings where owner_user_id='74000000-0000-0000-0000-000000000001' and not recovery_review_required and next_retry_at<=now() and status in ('pending','sync_failed','cancelling');
 assert n=1,'ten failures starved next job';
 assert exists(select 1 from public.calendar_bookings where id=last_id and not recovery_review_required),'eleventh job disappeared';
 c:=public.claim_calendar_booking_work(last_id,'74000000-0000-0000-0000-000000000001','sync',false);
 stale:=(c->>'sync_claim_token')::uuid;
 update public.calendar_bookings set sync_started_at=now()-interval '16 minutes' where id=last_id;
 assert public.reap_calendar_booking_leases()=1,'stale lease not recovered';
 c:=public.claim_calendar_booking_work(last_id,'74000000-0000-0000-0000-000000000001','sync',true);
 assert public.finish_calendar_booking_work(last_id,stale,true,'old-event') is null,'stale worker overwrote new claim';
 saved:=public.finish_calendar_booking_work(last_id,(c->>'sync_claim_token')::uuid,true,'stable-google-event');
 assert saved->>'status'='confirmed','confirmation failed';
 c:=public.claim_calendar_booking_work(last_id,'74000000-0000-0000-0000-000000000001','cancel',false);
 saved:=public.finish_calendar_booking_work(last_id,(c->>'sync_claim_token')::uuid,false);
 assert saved->>'status'='cancelling','cancellation intent lost';
 assert public.claim_calendar_booking_work(last_id,'74000000-0000-0000-0000-000000000001','sync',true) is null,'cancelled work recreated event';
 c:=public.claim_calendar_booking_work(last_id,'74000000-0000-0000-0000-000000000001','cancel',true);
 saved:=public.finish_calendar_booking_work(last_id,(c->>'sync_claim_token')::uuid,true);
 assert saved->>'status'='cancelled','cancel retry failed';
 -- Manual review approval resets only this reviewed job's retry budget.
 select id into last_id from public.calendar_bookings where owner_user_id='74000000-0000-0000-0000-000000000001' and recovery_review_required limit 1;
 c:=public.claim_calendar_booking_work(last_id,'74000000-0000-0000-0000-000000000001','sync',true);
 assert (c->>'recovery_attempts')::integer=1 and not (c->>'recovery_review_required')::boolean,'manual review retry not scoped/reset';
 perform public.finish_calendar_booking_work(last_id,(c->>'sync_claim_token')::uuid,false);
 delete from public.app_admin_users where user_id='74000000-0000-0000-0000-000000000001';
 perform public.reap_calendar_booking_leases();
 assert not exists(select 1 from public.calendar_bookings where owner_user_id='74000000-0000-0000-0000-000000000001' and status in ('pending','sync_failed','cancelling') and not recovery_review_required),'inactive owner blocks recovery queue';
 begin
 perform public.reserve_calendar_booking('74000000-0000-0000-0000-000000000004',t+interval '15 hours','Guest','inactive@example.invalid','','',gen_random_uuid(),'fixture');
 raise exception 'inactive owner accepted new booking';
 exception when raise_exception then if sqlerrm<>'booking_unavailable' then raise; end if; end;
end $$;
reset role;
rollback;
