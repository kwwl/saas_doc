/**
 * Typed HTTP client wrapping `fetch`.
 *
 * Responsibilities:
 *   - Prepend `NEXT_PUBLIC_API_URL` to every request
 *   - Attach `Authorization: Bearer <jwt>` from localStorage when present
 *   - Parse JSON responses and surface backend errors as `ApiError`
 *   - Handle 204 No Content (DELETE) without trying to parse a body
 *   - Provide a separate `upload` method for multipart/form-data (no
 *     Content-Type header — the browser sets the multipart boundary)
 */
import { getToken } from "./auth";
import type { ApiErrorDetail, ApiErrorResponse } from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  readonly status: number;
  readonly detail: ApiErrorDetail;

  constructor(status: number, detail: ApiErrorDetail) {
    const message =
      typeof detail === "string"
        ? detail
        : detail.map((d) => d.msg).join("; ") || "API error";
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOptions {
  method?: string;
  body?: BodyInit | null;
  headers?: HeadersInit;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail: ApiErrorDetail = response.statusText;
    try {
      const errorBody = (await response.json()) as ApiErrorResponse;
      if (errorBody?.detail !== undefined) detail = errorBody.detail;
    } catch {
      // body wasn't JSON; keep statusText
    }
    throw new ApiError(response.status, detail);
  }

  // 204 No Content → no body to parse
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

function jsonHeaders(body: unknown): HeadersInit {
  return body !== undefined ? { "Content-Type": "application/json" } : {};
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      headers: jsonHeaders(body),
      body: body !== undefined ? JSON.stringify(body) : null,
    });
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "PUT",
      headers: jsonHeaders(body),
      body: body !== undefined ? JSON.stringify(body) : null,
    });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: "DELETE" });
  },

  /** Multipart upload — DO NOT set Content-Type; the browser sets the boundary. */
  upload<T>(path: string, formData: FormData): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: formData,
    });
  },
};
