insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fiscal-documents',
  'fiscal-documents',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.fiscal_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_path text not null,
  file_name text not null,
  file_size bigint not null default 0,
  mime_type text not null default 'application/pdf',
  share_token uuid not null default gen_random_uuid(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fiscal_documents_share_token_key unique (share_token),
  constraint fiscal_documents_pdf_mime_check check (mime_type = 'application/pdf')
);

alter table public.fiscal_documents enable row level security;

drop policy if exists "admin_all_fiscal_documents" on public.fiscal_documents;
create policy "admin_all_fiscal_documents"
on public.fiscal_documents for all
to authenticated
using (true)
with check (true);

grant select, insert, update, delete on public.fiscal_documents to authenticated;

create index if not exists fiscal_documents_active_created_at_idx
on public.fiscal_documents (is_active, created_at desc);

create index if not exists fiscal_documents_share_token_idx
on public.fiscal_documents (share_token);

drop policy if exists "authenticated_read_fiscal_document_files" on storage.objects;
create policy "authenticated_read_fiscal_document_files"
on storage.objects for select
to authenticated
using (bucket_id = 'fiscal-documents');

drop policy if exists "authenticated_insert_fiscal_document_files" on storage.objects;
create policy "authenticated_insert_fiscal_document_files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'fiscal-documents');

drop policy if exists "authenticated_update_fiscal_document_files" on storage.objects;
create policy "authenticated_update_fiscal_document_files"
on storage.objects for update
to authenticated
using (bucket_id = 'fiscal-documents')
with check (bucket_id = 'fiscal-documents');

drop policy if exists "authenticated_delete_fiscal_document_files" on storage.objects;
create policy "authenticated_delete_fiscal_document_files"
on storage.objects for delete
to authenticated
using (bucket_id = 'fiscal-documents');
