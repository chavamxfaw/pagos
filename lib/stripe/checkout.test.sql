-- Local-only rollback regression. No provider calls.
begin;
insert into public.clients(id,name) values('72000000-0000-4000-8000-000000000021','Stripe checkout fixture');
insert into public.orders(id,client_id,concept,total_amount,subtotal_amount) values('72000000-0000-4000-8000-000000000022','72000000-0000-4000-8000-000000000021','Stripe fixture',1000,1000);
insert into public.stripe_payment_requests(id,order_id,client_id,amount,commission_payer,concept,total_charged)
values('72000000-0000-4000-8000-000000000023','72000000-0000-4000-8000-000000000022','72000000-0000-4000-8000-000000000021',100,'merchant','Fixture',100);
set local role service_role;
do $$ declare a jsonb; b jsonb; failed boolean; begin
 a=public.reserve_stripe_checkout('72000000-0000-4000-8000-000000000022','72000000-0000-4000-8000-000000000023',100,0,100,'{}');
 b=public.reserve_stripe_checkout('72000000-0000-4000-8000-000000000022','72000000-0000-4000-8000-000000000023',100,0,100,'{}');
 assert a->>'id'=b->>'id','reservation retries preserve identity';
 assert (select count(*) from public.stripe_checkout_sessions where order_id='72000000-0000-4000-8000-000000000022')=1;
 failed=false;
 begin update public.orders set status='cancelled' where id='72000000-0000-4000-8000-000000000022';
 exception when others then failed=true; end;
 assert failed,'creation-in-progress must prevent cancellation';
 update public.stripe_checkout_sessions set stripe_session_id='cs_reservation_fixture' where id=(a->>'id')::uuid;
 a=public.complete_stripe_checkout('cs_reservation_fixture','pi_reservation_fixture',100,'mxn',current_date);
 b=public.complete_stripe_checkout('cs_reservation_fixture','pi_reservation_fixture',100,'mxn',current_date);
 assert a->'payment'->>'id'=b->'payment'->>'id','delayed/replayed webhook must record exactly once';
 assert (select count(*) from public.payments where order_id='72000000-0000-4000-8000-000000000022')=1;
 assert (select paid_amount from public.orders where id='72000000-0000-4000-8000-000000000022')=100;
 update public.orders set status='cancelled' where id='72000000-0000-4000-8000-000000000022';
 failed=false;
 begin perform public.reserve_stripe_checkout('72000000-0000-4000-8000-000000000022','72000000-0000-4000-8000-000000000023',100,0,100,'{}');
 exception when others then failed=true; end;
 assert failed,'cancelled order cannot reserve';
end $$;
rollback;
