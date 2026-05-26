/**
 * TypeScript types mirroring the backend Pydantic schemas.
 *
 * IMPORTANT: keep these in sync with `backend/app/schemas/*.py`. Drift here
 * silently breaks compile-time guarantees on the frontend.
 *
 * UUID fields are typed as `string` (the API serializes them to strings).
 * Datetime fields are ISO 8601 strings — convert to Date at the call site if needed.
 */

// --- Auth ---

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
}

export interface RegisterPayload {
  organization_name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// --- Clients ---

export interface Client {
  id: string;
  name: string;
  siren: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  organization_id: string;
  created_at: string | null;
}

export interface ClientCreate {
  name: string;
  siren?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
}

export interface ClientUpdate {
  name?: string;
  siren?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
}

// --- Documents ---

export interface Document {
  id: string;
  client_id: string;
  organization_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by_id: string;
  created_at: string | null;
}

// --- Dashboard ---

export interface RecentDocumentItem {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  client_id: string;
  client_name: string;
  uploaded_by_email: string;
  created_at: string | null;
}

export interface RecentClientItem {
  id: string;
  name: string;
  document_count: number;
  created_at: string | null;
}

export interface DashboardSummary {
  total_clients: number;
  total_documents: number;
  total_storage_bytes: number;
  recent_documents: RecentDocumentItem[];
  recent_clients: RecentClientItem[];
}

// --- API error envelope ---

/** FastAPI returns either a string detail or an array of validation errors. */
export type ApiErrorDetail =
  | string
  | Array<{
      loc: (string | number)[];
      msg: string;
      type: string;
    }>;

export interface ApiErrorResponse {
  detail: ApiErrorDetail;
}
