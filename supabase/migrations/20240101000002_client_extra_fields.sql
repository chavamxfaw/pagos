alter table clients
  add column if not exists company text,
  add column if not exists rfc text,
  add column if not exists address text;
