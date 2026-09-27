-- Run only against an isolated local Supabase database after the CRM migrations.
-- psql <local-database-url> -v ON_ERROR_STOP=1 -f lib/crm/rls.test.sql
-- All fixtures are rolled back. Requires a database administration connection.
begin;
insert into auth.users(id, email) values
 ('fccc0000-0000-4000-8000-000000000001', 'crm-owner-test@example.invalid'),
 ('fccc0000-0000-4000-8000-000000000002', 'crm-other-admin-test@example.invalid'),
 ('fccc0000-0000-4000-8000-000000000003', 'crm-not-admin-test@example.invalid');
insert into public.app_admin_users(user_id) values
 ('fccc0000-0000-4000-8000-000000000001'), ('fccc0000-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub','fccc0000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ declare tab text; count_rows int; begin
 foreach tab in array array['crm_opportunities','crm_projects','crm_tasks','crm_proposals','crm_renewals'] loop
   execute format('insert into public.%I(owner_user_id,title) values ((select auth.uid()), %L)',tab,'CRM RLS fixture');
   execute format('select count(*) from public.%I where title = %L',tab,'CRM RLS fixture') into count_rows;
   if count_rows <> 1 then raise exception 'Owner cannot see own row in %',tab; end if;
   begin
     execute format('insert into public.%I(owner_user_id,title) values (%L,%L)',tab,'fccc0000-0000-4000-8000-000000000002','Forbidden fixture');
     raise exception 'Forged owner accepted in %',tab;
   exception when insufficient_privilege then null; end;
 end loop;
end $$;
select set_config('request.jwt.claim.sub','fccc0000-0000-4000-8000-000000000002',true);
do $$ declare tab text; count_rows int; begin
 foreach tab in array array['crm_opportunities','crm_projects','crm_tasks','crm_proposals','crm_renewals'] loop
   execute format('select count(*) from public.%I where title = %L',tab,'CRM RLS fixture') into count_rows;
   if count_rows <> 0 then raise exception 'Cross-owner read in %',tab; end if;
   execute format('update public.%I set title = %L where title = %L',tab,'Forbidden update','CRM RLS fixture');
   get diagnostics count_rows = row_count;
   if count_rows <> 0 then raise exception 'Cross-owner update in %',tab; end if;
   execute format('delete from public.%I where title = %L',tab,'CRM RLS fixture');
   get diagnostics count_rows = row_count;
   if count_rows <> 0 then raise exception 'Cross-owner delete in %',tab; end if;
 end loop;
end $$;
select set_config('request.jwt.claim.sub','fccc0000-0000-4000-8000-000000000003',true);
do $$ declare tab text; count_rows int; begin
 foreach tab in array array['crm_opportunities','crm_projects','crm_tasks','crm_proposals','crm_renewals'] loop
   execute format('select count(*) from public.%I',tab) into count_rows;
   if count_rows <> 0 then raise exception 'Non-admin read in %',tab; end if;
   begin
     execute format('insert into public.%I(owner_user_id,title) values ((select auth.uid()), %L)',tab,'Forbidden fixture');
     raise exception 'Non-admin write in %',tab;
   exception when insufficient_privilege then null; end;
 end loop;
 if has_table_privilege('authenticated','public.platform_accounts','select') then raise exception 'Platform inventory exposed to authenticated'; end if;
end $$;
set local role anon;
do $$ declare tab text; begin
 foreach tab in array array['crm_opportunities','crm_projects','crm_tasks','crm_proposals','crm_renewals','platform_accounts'] loop
   if has_table_privilege('anon','public.' || tab,'select,insert,update,delete') then raise exception 'Anonymous grant in %',tab; end if;
 end loop;
end $$;
reset role;
rollback;
