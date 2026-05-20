alter table public.orders
  add column if not exists public_sort_order integer not null default 100,
  add column if not exists public_show_fiscal_document boolean not null default false,
  add column if not exists fiscal_document_id uuid references public.fiscal_documents(id) on delete set null;

alter table public.orders
  drop constraint if exists orders_public_sort_order_check,
  add constraint orders_public_sort_order_check check (public_sort_order between 0 and 9999);

create index if not exists orders_client_public_sort_idx
on public.orders(client_id, public_sort_order asc, created_at desc);

create index if not exists orders_fiscal_document_id_idx
on public.orders(fiscal_document_id)
where fiscal_document_id is not null;
