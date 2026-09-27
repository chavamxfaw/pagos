-- Run only on a disposable local database. All fixtures roll back.
begin;
insert into auth.users(id,email) values('71000000-0000-4000-8000-000000000001','owner@fixture.test');
insert into public.app_admin_users(user_id) values('71000000-0000-4000-8000-000000000001');
insert into public.clients(id,name,email) values('71000000-0000-4000-8000-000000000002','Fixture contact','client@fixture.test');
insert into public.orders(id,client_id,concept,total_amount,subtotal_amount) values('71000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000002','Fixture order',1000,1000);
set local role service_role;
do $$ declare payload jsonb; a jsonb; b jsonb; failed boolean; begin
 payload=jsonb_build_object('order_id','71000000-0000-4000-8000-000000000003','amount',100,'concept','fixture','payment_method','transfer','paid_at','2026-09-10');
 a=public.record_agent_payment('test-idempotency-key-01','71000000-0000-4000-8000-000000000001',payload);
 b=public.record_agent_payment('test-idempotency-key-01','71000000-0000-4000-8000-000000000001',payload);
 assert a->'payment'->>'id'=b->'payment'->>'id','retries must return same payment';
 assert (b->>'replayed')::boolean,'retry flag required';
 assert (select count(*) from public.payments where order_id='71000000-0000-4000-8000-000000000003')=1,'no duplicate payment';
 assert (select count(*) from public.payment_receipt_deliveries where payment_id=(a->'payment'->>'id')::uuid)=2,'outbox is atomic';
 failed=false;
 begin perform public.record_agent_payment('test-idempotency-key-01','71000000-0000-4000-8000-000000000001',payload||'{"amount":200}');
 exception when others then failed=true; end;
 assert failed,'payload mismatch must fail';
 failed=false;
 begin perform public.record_agent_payment('test-idempotency-key-02','71000000-0000-4000-8000-000000000009',payload);
 exception when others then failed=true; end;
 assert failed,'non-owner actor must fail';
 failed=false;
 begin perform public.record_agent_payment('test-idempotency-key-03','71000000-0000-4000-8000-000000000001',payload||'{"amount":1000}');
 exception when others then failed=true; end;
 assert failed,'overpayment must fail';
end $$;
insert into public.stripe_checkout_sessions(id,order_id,client_id,stripe_session_id,amount,fee_amount,total_charged,commission_payer)
values('71000000-0000-4000-8000-000000000004','71000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000002','cs_fixture',200,0,200,'merchant');
do $$ declare a jsonb; b jsonb; failed boolean; begin
 failed=false;
 begin perform public.complete_stripe_checkout('cs_fixture','pi_fixture',201,'mxn','2026-09-10');
 exception when others then failed=true; end;
 assert failed,'wrong amount must fail';
 assert (select status from public.stripe_checkout_sessions where stripe_session_id='cs_fixture')='pending','failure cannot mark checkout paid';
 failed=false;
 begin perform public.complete_stripe_checkout('cs_fixture','pi_fixture',200,'usd','2026-09-10');
 exception when others then failed=true; end;
 assert failed,'wrong currency must fail';
 a=public.complete_stripe_checkout('cs_fixture','pi_fixture',200,'mxn','2026-09-10');
 b=public.complete_stripe_checkout('cs_fixture','pi_fixture',200,'mxn','2026-09-10');
 assert a->'payment'->>'id'=b->'payment'->>'id','stripe retries must not duplicate';
 assert (select paid_amount from public.orders where id='71000000-0000-4000-8000-000000000003')=300,'balance must match payments';
end $$;
-- Simulate insert failure after provider payment; checkout must remain pending.
insert into public.stripe_checkout_sessions(order_id,client_id,stripe_session_id,amount,fee_amount,total_charged,commission_payer)
values('71000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000002','cs_fixture_overflow',800,0,800,'merchant');
do $$ declare failed boolean=false; begin
 begin perform public.complete_stripe_checkout('cs_fixture_overflow','pi_overflow',800,'mxn','2026-09-10');
 exception when others then failed=true; end;
 assert failed;
  assert (select status from public.stripe_checkout_sessions where stripe_session_id='cs_fixture_overflow')='pending','transaction rollback must retain retryability';
end $$;
update public.stripe_checkout_sessions set status='paid' where stripe_session_id='cs_fixture_overflow';
do $$ declare failed boolean=false; begin
 begin perform public.complete_stripe_checkout('cs_fixture_overflow','pi_overflow',800,'mxn','2026-09-10');
 exception when others then failed=true; end;
 assert failed,'legacy paid checkout without ledger must require reconciliation';
end $$;
insert into public.whatsapp_messages(provider_sid,direction,phone,body,status) values('SMfixture','outbound','528112345678','fixture','sending');
select public.apply_whatsapp_status('SMfixture','delivered',null);
select public.apply_whatsapp_status('SMfixture','sent',null);
select public.apply_whatsapp_status('SMfixture','delivered',null);
do $$ begin
 assert (select status from public.whatsapp_messages where provider_sid='SMfixture')='delivered','out of order callback must not regress';
 assert (select count(*) from public.whatsapp_status_events where provider_sid='SMfixture')=2,'callback duplicate must deduplicate';
end $$;
reset role;
do $$ begin
 assert not has_function_privilege('anon','public.record_agent_payment(text,uuid,jsonb)','execute');
 assert not has_function_privilege('authenticated','public.record_agent_payment(text,uuid,jsonb)','execute');
 assert not has_function_privilege('authenticated','public.complete_stripe_checkout(text,text,numeric,text,date)','execute');
 assert not has_table_privilege('anon','public.whatsapp_messages','select');
end $$;
rollback;
