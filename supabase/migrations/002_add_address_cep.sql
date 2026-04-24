alter table if exists public.document_extractions
  add column if not exists address text,
  add column if not exists cep text;

