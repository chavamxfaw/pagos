alter table clients
  add column if not exists client_portal_token uuid default gen_random_uuid() unique not null,
  add column if not exists client_portal_enabled boolean default false not null;

create index if not exists clients_client_portal_token_idx
  on clients(client_portal_token);
