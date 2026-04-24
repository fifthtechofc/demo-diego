alter table if exists public.document_extractions
  add column if not exists bairro text,
  add column if not exists telefone text;

