create extension if not exists "pgcrypto";

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_path text not null,
  file_url text,
  file_size bigint not null default 0,
  mime_type text not null default 'application/pdf',
  status text not null default 'processing' check (status in ('processing', 'processed', 'error')),
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists documents_file_path_key on public.documents (file_path);

create table if not exists public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  raw_text text,
  patient_name text,
  surgery_name text,
  hospital_name text,
  address text,
  doctor_name text,
  insurance_name text,
  surgery_date text,
  city text,
  state text,
  cep text,
  cnpj text,
  cpf text,
  bairro text,
  telefone text,
  representative text,
  requester text,
  requester_channel text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_extractions_document_id_key unique (document_id)
);

create table if not exists public.document_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  content text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists document_items_document_id_idx on public.document_items (document_id);
