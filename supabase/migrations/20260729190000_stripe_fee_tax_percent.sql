alter table public.stripe_settings
  add column if not exists fee_tax_percent numeric(6, 3) not null default 16.000;

alter table public.stripe_settings
  drop constraint if exists stripe_settings_fee_tax_percent_nonnegative;

alter table public.stripe_settings
  add constraint stripe_settings_fee_tax_percent_nonnegative
  check (fee_tax_percent >= 0);
