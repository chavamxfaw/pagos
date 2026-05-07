alter table public.user_settings
  add column if not exists admin_phone text,
  add column if not exists notify_stripe_email boolean not null default true,
  add column if not exists notify_stripe_whatsapp boolean not null default false;
