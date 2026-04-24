export type DocumentStatus = "processing" | "processed" | "error";

export interface DocumentRow {
  id: string;
  file_name: string;
  file_path: string;
  file_url: string | null;
  file_size: number;
  mime_type: string;
  status: DocumentStatus;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentExtractionRow {
  id: string;
  document_id: string;
  raw_text: string | null;
  patient_name: string | null;
  surgery_name: string | null;
  hospital_name: string | null;
  address: string | null;
  doctor_name: string | null;
  insurance_name: string | null;
  surgery_date: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  cnpj: string | null;
  cpf: string | null;
  bairro: string | null;
  telefone: string | null;
  representative: string | null;
  requester: string | null;
  requester_channel: string | null;
  event_start_at: string | null;
  event_end_at: string | null;
  event_timezone: string | null;
  event_datetime_raw: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentItemRow {
  id: string;
  document_id: string;
  content: string;
  sort_order: number;
  created_at: string;
}

export interface ParsedExtractionFields {
  patient_name: string | null;
  surgery_name: string | null;
  hospital_name: string | null;
  address: string | null;
  doctor_name: string | null;
  insurance_name: string | null;
  surgery_date: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  cnpj: string | null;
  cpf: string | null;
  bairro: string | null;
  telefone: string | null;
  representative: string | null;
  requester: string | null;
  requester_channel: string | null;
  event_start_at: string | null;
  event_end_at: string | null;
  event_timezone: string | null;
  event_datetime_raw: string | null;
}

export interface ParsedDocumentItem {
  content: string;
}

export interface DocumentWithRelations extends DocumentRow {
  extraction: DocumentExtractionRow | null;
  items: DocumentItemRow[];
}
