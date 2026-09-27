-- Allow the existing own-membership RLS policy to authorize CRM session queries.
grant select on public.app_admin_users to authenticated;
alter table public.crm_opportunities add constraint crm_opportunities_owner_id_unique unique (owner_user_id, id);
alter table public.crm_projects add constraint crm_projects_owner_id_unique unique (owner_user_id, id);
alter table public.crm_projects add column source_opportunity_id uuid;
alter table public.crm_projects add constraint crm_projects_source_owner_fk foreign key (owner_user_id, source_opportunity_id) references public.crm_opportunities(owner_user_id, id);
create unique index crm_projects_source_unique on public.crm_projects(source_opportunity_id) where source_opportunity_id is not null;
alter table public.crm_tasks add column project_id uuid, add column opportunity_id uuid;
alter table public.crm_proposals add column project_id uuid, add column opportunity_id uuid;
alter table public.crm_tasks add constraint crm_tasks_project_owner_fk foreign key (owner_user_id, project_id) references public.crm_projects(owner_user_id, id);
alter table public.crm_tasks add constraint crm_tasks_opportunity_owner_fk foreign key (owner_user_id, opportunity_id) references public.crm_opportunities(owner_user_id, id);
alter table public.crm_proposals add constraint crm_proposals_project_owner_fk foreign key (owner_user_id, project_id) references public.crm_projects(owner_user_id, id);
alter table public.crm_proposals add constraint crm_proposals_opportunity_owner_fk foreign key (owner_user_id, opportunity_id) references public.crm_opportunities(owner_user_id, id);
create index crm_tasks_project_idx on public.crm_tasks(project_id);
create index crm_tasks_opportunity_idx on public.crm_tasks(opportunity_id);
create index crm_proposals_project_idx on public.crm_proposals(project_id);
create index crm_proposals_opportunity_idx on public.crm_proposals(opportunity_id);
alter table public.orders add column crm_project_id uuid references public.crm_projects(id);
create index orders_crm_project_idx on public.orders(crm_project_id);

create function public.crm_convert_opportunity(p_owner uuid, p_opportunity uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare source public.crm_opportunities; project_id uuid;
begin
  if ((select auth.uid()) is distinct from p_owner and current_user <> 'service_role')
     or not exists (select 1 from public.app_admin_users where user_id = p_owner) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
  select * into source from public.crm_opportunities where id = p_opportunity and owner_user_id = p_owner for update;
  if source.id is null or source.status <> 'won' then raise exception 'Won opportunity required'; end if;
  select id into project_id from public.crm_projects where source_opportunity_id = source.id and owner_user_id = p_owner;
  if project_id is not null then return jsonb_build_object('project_id',project_id,'replayed',true); end if;
  insert into public.crm_projects(owner_user_id,client_id,title,notes,budget_amount,due_date,source_opportunity_id)
  values(p_owner,source.client_id,source.title,source.notes,source.value_amount,source.due_date,source.id) returning id into project_id;
  return jsonb_build_object('project_id',project_id,'replayed',false);
end $$;
revoke all on function public.crm_convert_opportunity(uuid,uuid) from public, anon;
grant execute on function public.crm_convert_opportunity(uuid,uuid) to authenticated, service_role;

-- Keep direct REST writes consistent with the server's project/contact validation.
create function public.crm_check_order_project() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare project public.crm_projects;
begin
  if new.crm_project_id is null then return new; end if;
  select * into project from public.crm_projects where id = new.crm_project_id;
  if project.id is null or project.client_id is distinct from new.client_id then raise exception 'Project and order must share contact'; end if;
  if current_user <> 'service_role' and project.owner_user_id is distinct from (select auth.uid()) then raise exception 'Unauthorized project' using errcode = '42501'; end if;
  return new;
end $$;
revoke all on function public.crm_check_order_project() from public, anon;
grant execute on function public.crm_check_order_project() to authenticated, service_role;
create trigger crm_order_project_check before insert or update of crm_project_id,client_id on public.orders for each row execute function public.crm_check_order_project();
