begin;
insert into auth.users(id,email) values ('72000000-0000-4000-8000-000000000001','workflow-owner@example.invalid'),('72000000-0000-4000-8000-000000000002','workflow-other@example.invalid');
insert into public.app_admin_users(user_id) values ('72000000-0000-4000-8000-000000000001'),('72000000-0000-4000-8000-000000000002');
insert into public.clients(id,name,email) values ('72000000-0000-4000-8000-000000000021','CRM client one','crm-one@example.invalid'),('72000000-0000-4000-8000-000000000022','CRM client two','crm-two@example.invalid');
-- Reproduce the legacy authenticated grants in the isolated bootstrap; rolled back.
grant select, insert, update on public.orders to authenticated;
select set_config('request.jwt.claim.sub','72000000-0000-4000-8000-000000000001',true);
set local role authenticated;
insert into public.crm_opportunities(id,owner_user_id,title,status,value_amount) values ('72000000-0000-4000-8000-000000000011',auth.uid(),'Won work','won',2500),('72000000-0000-4000-8000-000000000012',auth.uid(),'Open work','new',2500);
do $$ declare first_result jsonb; second_result jsonb; saved public.crm_projects; begin
 first_result := public.crm_convert_opportunity(auth.uid(),'72000000-0000-4000-8000-000000000011');
 second_result := public.crm_convert_opportunity(auth.uid(),'72000000-0000-4000-8000-000000000011');
 if first_result->>'project_id' <> second_result->>'project_id' or (first_result->>'replayed')::boolean or not (second_result->>'replayed')::boolean then raise exception 'Conversion must be idempotent'; end if;
 select * into saved from public.crm_projects where id = (first_result->>'project_id')::uuid;
 if saved.budget_amount <> 2500 or saved.title <> 'Won work' then raise exception 'Conversion lost business fields'; end if;
 begin
   perform public.crm_convert_opportunity(auth.uid(),'72000000-0000-4000-8000-000000000012');
   raise exception 'Test failed: converted non-won opportunity';
 exception when raise_exception then
   if sqlerrm <> 'Won opportunity required' then raise; end if;
 end;
end $$;
insert into public.crm_projects(id,owner_user_id,client_id,title) values ('72000000-0000-4000-8000-000000000031',auth.uid(),'72000000-0000-4000-8000-000000000021','Order project');
insert into public.orders(client_id,concept,total_amount,subtotal_amount,crm_project_id) values ('72000000-0000-4000-8000-000000000021','Linked order',100,100,'72000000-0000-4000-8000-000000000031');
do $$ begin
 begin
   insert into public.orders(client_id,concept,total_amount,subtotal_amount,crm_project_id) values ('72000000-0000-4000-8000-000000000022','Wrong contact',100,100,'72000000-0000-4000-8000-000000000031');
   raise exception 'Test failed: project/order contact mismatch accepted';
 exception when check_violation then
   if sqlerrm <> 'crm_contact_relationship_conflict' then raise; end if;
 end;
end $$;
select set_config('request.jwt.claim.sub','72000000-0000-4000-8000-000000000002',true);
do $$ begin
 begin
   perform public.crm_convert_opportunity('72000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000011');
   raise exception 'Test failed: cross-owner conversion';
 exception when insufficient_privilege then null; end;
end $$;
do $$ begin
 begin
   insert into public.crm_tasks(owner_user_id,title,project_id) values (auth.uid(),'Forged relation','72000000-0000-4000-8000-000000000031');
   raise exception 'Test failed: cross-owner relation accepted';
 exception when check_violation then
   if sqlerrm <> 'crm_contact_relationship_conflict' then raise; end if;
 end;
 begin
   insert into public.orders(client_id,concept,total_amount,subtotal_amount,crm_project_id) values ('72000000-0000-4000-8000-000000000021','Other owner order',100,100,'72000000-0000-4000-8000-000000000031');
   raise exception 'Test failed: cross-owner project/order accepted';
 exception when check_violation then
   if sqlerrm <> 'crm_contact_relationship_conflict' then raise; end if;
 end;
end $$;
reset role;
rollback;
