alter table public.ip_rate_limits
  drop constraint if exists ip_rate_limits_scope_check;

alter table public.ip_rate_limits
  add constraint ip_rate_limits_scope_check
  check (scope in ('auth', 'public_link', 'stripe_checkout', 'agent_api'));
