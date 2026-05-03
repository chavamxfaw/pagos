alter table orders
  add column if not exists requires_invoice boolean default false not null,
  add column if not exists tax_mode text default 'none' not null
    check (tax_mode in ('none', 'included', 'added')),
  add column if not exists subtotal_amount numeric(12,2),
  add column if not exists tax_amount numeric(12,2) default 0 not null,
  add column if not exists tax_rate numeric(5,4) default 0 not null;

update orders
set
  tax_mode = 'none',
  subtotal_amount = total_amount,
  tax_amount = 0,
  tax_rate = 0
where subtotal_amount is null;

alter table orders
  alter column subtotal_amount set not null;
