create table if not exists public.ip_rate_limits (
  id uuid primary key default gen_random_uuid(),
  ip inet not null,
  scope text not null,
  window_start timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  blocked_until timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint ip_rate_limits_scope_not_empty check (length(trim(scope)) > 0),
  constraint ip_rate_limits_ip_scope_key unique (ip, scope)
);

alter table public.ip_rate_limits enable row level security;

revoke all on table public.ip_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.ip_rate_limits to service_role;

create index if not exists ip_rate_limits_blocked_until_idx
on public.ip_rate_limits (blocked_until)
where blocked_until is not null;

create index if not exists ip_rate_limits_last_seen_at_idx
on public.ip_rate_limits (last_seen_at desc);

create or replace function public.check_ip_rate_limit(
  p_ip text,
  p_scope text,
  p_limit integer,
  p_window_seconds integer,
  p_block_seconds integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  request_count integer,
  blocked_until timestamptz
)
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_ip inet;
  v_row public.ip_rate_limits%rowtype;
  v_count integer;
  v_blocked_until timestamptz;
begin
  if p_limit <= 0 or p_window_seconds <= 0 or p_block_seconds <= 0 then
    raise exception 'Invalid rate limit configuration';
  end if;

  v_ip := p_ip::inet;

  select *
  into v_row
  from public.ip_rate_limits
  where ip = v_ip and scope = p_scope
  for update;

  if not found then
    insert into public.ip_rate_limits (ip, scope, window_start, request_count, last_seen_at)
    values (v_ip, p_scope, v_now, 1, v_now);

    allowed := true;
    retry_after_seconds := 0;
    request_count := 1;
    blocked_until := null;
    return next;
    return;
  end if;

  if v_row.blocked_until is not null and v_row.blocked_until > v_now then
    update public.ip_rate_limits
    set last_seen_at = v_now
    where id = v_row.id;

    allowed := false;
    retry_after_seconds := greatest(1, ceil(extract(epoch from (v_row.blocked_until - v_now)))::integer);
    request_count := v_row.request_count;
    blocked_until := v_row.blocked_until;
    return next;
    return;
  end if;

  if v_row.window_start <= v_now - make_interval(secs => p_window_seconds) then
    update public.ip_rate_limits
    set window_start = v_now,
        request_count = 1,
        blocked_until = null,
        last_seen_at = v_now
    where id = v_row.id;

    allowed := true;
    retry_after_seconds := 0;
    request_count := 1;
    blocked_until := null;
    return next;
    return;
  end if;

  v_count := v_row.request_count + 1;
  v_blocked_until := case
    when v_count > p_limit then v_now + make_interval(secs => p_block_seconds)
    else null
  end;

  update public.ip_rate_limits
  set request_count = v_count,
      blocked_until = v_blocked_until,
      last_seen_at = v_now
  where id = v_row.id;

  allowed := v_count <= p_limit;
  retry_after_seconds := case
    when v_blocked_until is null then 0
    else p_block_seconds
  end;
  request_count := v_count;
  blocked_until := v_blocked_until;
  return next;
end;
$$;

revoke all on function public.check_ip_rate_limit(text, text, integer, integer, integer) from public;
revoke all on function public.check_ip_rate_limit(text, text, integer, integer, integer) from anon;
revoke all on function public.check_ip_rate_limit(text, text, integer, integer, integer) from authenticated;
grant execute on function public.check_ip_rate_limit(text, text, integer, integer, integer) to service_role;
