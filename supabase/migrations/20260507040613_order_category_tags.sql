alter table public.orders
  add column if not exists category text not null default 'service',
  add column if not exists tags text[] not null default '{}';

alter table public.orders
  drop constraint if exists orders_category_check,
  add constraint orders_category_check
    check (category in ('service', 'product', 'project', 'subscription', 'other'));

create index if not exists orders_category_idx on public.orders(category);
create index if not exists orders_tags_gin_idx on public.orders using gin(tags);
