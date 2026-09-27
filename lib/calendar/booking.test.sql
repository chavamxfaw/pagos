\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('73000000-0000-0000-0000-000000000001');
insert into public.app_admin_users(user_id) values ('73000000-0000-0000-0000-000000000001');
insert into public.calendar_connections(id,owner_user_id,account_email,refresh_token_encrypted) values ('73000000-0000-0000-0000-000000000002','73000000-0000-0000-0000-000000000001','fixture@example.invalid','fixture');
insert into public.connected_calendars(id,owner_user_id,connection_id,google_calendar_id,name,access_role) values ('73000000-0000-0000-0000-000000000003','73000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000002','fixture','Fixture','owner');
insert into public.booking_event_types(id,owner_user_id,title,destination_calendar_id,weekdays,notice_hours,start_hour,end_hour,timezone) values ('73000000-0000-0000-0000-000000000004','73000000-0000-0000-0000-000000000001','Fixture','73000000-0000-0000-0000-000000000003',array[1,2,3,4,5,6,7],0,0,24,'UTC');
insert into public.clients(id,name,email) values ('73000000-0000-0000-0000-000000000010','Existing person','fixture@example.invalid');
set local role service_role;
do $$ declare b jsonb; again jsonb; t timestamptz:=date_trunc('day',now())+interval '2 days 10 hours'; begin
 b:=public.reserve_calendar_booking('73000000-0000-0000-0000-000000000004',t,'Fixture','fixture@example.invalid','','','73000000-0000-0000-0000-000000000005','same');
 again:=public.reserve_calendar_booking('73000000-0000-0000-0000-000000000004',t,'Fixture','fixture@example.invalid','','','73000000-0000-0000-0000-000000000005','same');
 if b->>'id'<>again->>'id' then raise exception 'duplicate retry'; end if;
 if b->>'client_id' is not null or b->>'contact_link_status'<>'unverified' then raise exception 'public guest impersonated existing contact'; end if;
 if (select count(*) from public.clients where email='fixture@example.invalid')<>1 then raise exception 'public guest created CRM contact'; end if;
 if b->>'destination_calendar_id'<>'73000000-0000-0000-0000-000000000003' then raise exception 'missing destination snapshot'; end if;
 begin
 update public.calendar_bookings set destination_calendar_id='73000000-0000-0000-0000-000000000099' where id=(b->>'id')::uuid;
 raise exception 'destination mutated';
 exception when raise_exception then if sqlerrm<>'booking_destination_is_immutable' then raise; end if; end;
 begin
 perform public.reserve_calendar_booking('73000000-0000-0000-0000-000000000004',t,'Other','other@example.invalid','','','73000000-0000-0000-0000-000000000006','other');
 raise exception 'overlap accepted';
 exception when exclusion_violation then null; end;
 if (select count(*) from public.clients where email='other@example.invalid')<>0 then raise exception 'failed reservation left orphan contact'; end if;
 begin
 perform public.reserve_calendar_booking('73000000-0000-0000-0000-000000000004',t,'Fixture','fixture@example.invalid','','','73000000-0000-0000-0000-000000000005','changed');
 raise exception 'idempotency mismatch accepted';
 exception when raise_exception then if sqlerrm<>'idempotency_conflict' then raise; end if; end;
 begin
 perform public.approve_calendar_booking_contact((b->>'id')::uuid,'73000000-0000-0000-0000-000000000099','73000000-0000-0000-0000-000000000010');
 raise exception 'nonowner approved contact';
 exception when insufficient_privilege then null; end;
 perform public.approve_calendar_booking_contact((b->>'id')::uuid,'73000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000010');
 perform public.approve_calendar_booking_contact((b->>'id')::uuid,'73000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000010');
 if not exists(select 1 from public.calendar_bookings where id=(b->>'id')::uuid and client_id='73000000-0000-0000-0000-000000000010' and contact_link_status='approved' and contact_approved_by=owner_user_id and contact_approved_at is not null) then raise exception 'explicit owner approval missing'; end if;
end $$;
reset role;
-- Check catalog ACLs here; actual denied calls run in fresh sessions in
-- permissions.test.mjs. Reusing a cached PL/pgSQL invocation after SET ROLE
-- provoked a SIGSEGV in the local Supabase image during the original audit.
do $$ declare fn text; begin
 assert not has_table_privilege('anon','public.calendar_connections','select'),'anon reads OAuth secrets';
 assert not has_table_privilege('authenticated','public.calendar_connections','select'),'authenticated reads OAuth secrets';
 foreach fn in array array[
 'public.reserve_calendar_booking(uuid,timestamptz,text,text,text,text,uuid,text)',
 'public.approve_calendar_booking_contact(uuid,uuid,uuid)',
 'public.claim_calendar_booking_work(uuid,uuid,text,boolean)',
 'public.finish_calendar_booking_work(uuid,uuid,boolean,text)',
 'public.reap_calendar_booking_leases()'
 ] loop
 assert not has_function_privilege('anon',fn,'execute'),'anon privileged RPC';
 assert not has_function_privilege('authenticated',fn,'execute'),'authenticated privileged RPC';
 assert has_function_privilege('service_role',fn,'execute'),'service RPC inaccessible';
 end loop;
end $$;
rollback;
