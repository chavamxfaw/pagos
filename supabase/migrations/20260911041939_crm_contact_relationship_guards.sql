-- Protect contact identity on every Data API and server write, including reverse edits.
-- Parent SHARE locks serialize child creation against parent contact reassignment.
begin;
do $$ begin
 if exists(select 1 from public.crm_tasks t join public.crm_projects p on p.id=t.project_id where t.client_id is distinct from p.client_id)
 or exists(select 1 from public.crm_tasks t join public.crm_opportunities o on o.id=t.opportunity_id where t.client_id is distinct from o.client_id)
 or exists(select 1 from public.crm_proposals t join public.crm_projects p on p.id=t.project_id where t.client_id is distinct from p.client_id)
 or exists(select 1 from public.crm_proposals t join public.crm_opportunities o on o.id=t.opportunity_id where t.client_id is distinct from o.client_id)
 or exists(select 1 from public.crm_projects p join public.crm_opportunities o on o.id=p.source_opportunity_id where p.client_id is distinct from o.client_id)
 or exists(select 1 from public.orders o join public.crm_projects p on p.id=o.crm_project_id where o.client_id is distinct from p.client_id)
 then raise exception 'Existing CRM contact relationships need review before migration'; end if;
end $$;

create function public.crm_check_child_contact() returns trigger
language plpgsql security invoker set search_path='' as $$
declare parent_client uuid; parent_found boolean;
begin
 -- ON DELETE SET NULL of a contact updates related records individually; all end as NULL.
 if tg_op='UPDATE' and pg_trigger_depth()>1 and new.client_id is null and old.client_id is not null
   and not exists(select 1 from public.clients where id=old.client_id) then return new; end if;
 if new.project_id is not null then
   select client_id into parent_client from public.crm_projects where id=new.project_id and owner_user_id=new.owner_user_id for share;
   parent_found=found;
   if not parent_found or parent_client is distinct from new.client_id then
     raise exception 'crm_contact_relationship_conflict' using errcode='23514';
   end if;
 end if;
 if new.opportunity_id is not null then
   select client_id into parent_client from public.crm_opportunities where id=new.opportunity_id and owner_user_id=new.owner_user_id for share;
   parent_found=found;
   if not parent_found or parent_client is distinct from new.client_id then
     raise exception 'crm_contact_relationship_conflict' using errcode='23514';
   end if;
 end if;
 return new;
end $$;
create trigger crm_tasks_contact_check before insert or update of client_id,owner_user_id,project_id,opportunity_id
on public.crm_tasks for each row execute function public.crm_check_child_contact();
create trigger crm_proposals_contact_check before insert or update of client_id,owner_user_id,project_id,opportunity_id
on public.crm_proposals for each row execute function public.crm_check_child_contact();

create function public.crm_check_project_source_contact() returns trigger
language plpgsql security invoker set search_path='' as $$
declare parent_client uuid; parent_found boolean;
begin
 if tg_op='UPDATE' and pg_trigger_depth()>1 and new.client_id is null and old.client_id is not null
   and not exists(select 1 from public.clients where id=old.client_id) then return new; end if;
 if new.source_opportunity_id is null then return new; end if;
 select client_id into parent_client from public.crm_opportunities where id=new.source_opportunity_id and owner_user_id=new.owner_user_id for share;
 parent_found=found;
 if not parent_found or parent_client is distinct from new.client_id then
   raise exception 'crm_contact_relationship_conflict' using errcode='23514';
 end if;
 return new;
end $$;
create trigger crm_project_source_contact_check before insert or update of client_id,owner_user_id,source_opportunity_id
on public.crm_projects for each row execute function public.crm_check_project_source_contact();

create function public.crm_guard_parent_contact() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.client_id is not distinct from old.client_id then return new; end if;
 if pg_trigger_depth()>1 and new.client_id is null and old.client_id is not null
   and not exists(select 1 from public.clients where id=old.client_id) then return new; end if;
 if tg_table_name='crm_projects' then
   if exists(select 1 from public.orders where crm_project_id=old.id and client_id is distinct from new.client_id)
   or exists(select 1 from public.crm_tasks where project_id=old.id and client_id is distinct from new.client_id)
   or exists(select 1 from public.crm_proposals where project_id=old.id and client_id is distinct from new.client_id)
   then raise exception 'crm_contact_relationship_conflict' using errcode='23514'; end if;
 else
   if exists(select 1 from public.crm_tasks where opportunity_id=old.id and client_id is distinct from new.client_id)
   or exists(select 1 from public.crm_proposals where opportunity_id=old.id and client_id is distinct from new.client_id)
   or exists(select 1 from public.crm_projects where source_opportunity_id=old.id and client_id is distinct from new.client_id)
   then raise exception 'crm_contact_relationship_conflict' using errcode='23514'; end if;
 end if;
 return new;
end $$;
create trigger crm_project_contact_guard before update of client_id on public.crm_projects
for each row execute function public.crm_guard_parent_contact();
create trigger crm_opportunity_contact_guard before update of client_id on public.crm_opportunities
for each row execute function public.crm_guard_parent_contact();

create or replace function public.crm_check_order_project() returns trigger
language plpgsql security invoker set search_path='' as $$
declare project public.crm_projects;
begin
 if new.crm_project_id is null then return new; end if;
 select * into project from public.crm_projects where id=new.crm_project_id for share;
 if project.id is null or project.client_id is distinct from new.client_id then
   raise exception 'crm_contact_relationship_conflict' using errcode='23514';
 end if;
 if current_user<>'service_role' and project.owner_user_id is distinct from (select auth.uid()) then
   raise exception 'Unauthorized project' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function public.crm_check_child_contact() from public,anon;
revoke all on function public.crm_check_project_source_contact() from public,anon;
revoke all on function public.crm_guard_parent_contact() from public,anon;
grant execute on function public.crm_check_child_contact() to authenticated,service_role;
grant execute on function public.crm_check_project_source_contact() to authenticated,service_role;
grant execute on function public.crm_guard_parent_contact() to authenticated,service_role;
commit;
