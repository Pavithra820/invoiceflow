import type {
  Invoice,
  InvoiceCreatePayload,
  InvoiceList,
  InvoiceStatus,
  User,
} from "./types";

const BASE = "/api";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(value: string | null): void {
  token = value;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

// FastAPI sends either {"detail": "text"} or {"detail": [{"msg": "..."}, ...]}.
function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : ""))
        .filter(Boolean);
      if (messages.length > 0) return messages.join("; ");
    }
  }
  return fallback;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Is the backend running?");
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // the body was not JSON; fall back to a generic message
    }
    if (response.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new ApiError(response.status, errorMessage(body, `Request failed (${response.status})`));
  }
  return (await response.json()) as T;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export function register(email: string, password: string): Promise<User> {
  return request<User>("/auth/register", jsonInit("POST", { email, password }));
}

export function login(email: string, password: string): Promise<{ access_token: string }> {
  // The login endpoint follows the OAuth2 form standard, so it takes form data, not JSON.
  const form = new URLSearchParams({ username: email, password });
  return request("/auth/login", { method: "POST", body: form });
}

export function getMe(): Promise<User> {
  return request<User>("/auth/me");
}

export interface ListParams {
  page: number;
  pageSize: number;
  status?: InvoiceStatus;
  supplier?: string;
}

export function listInvoices(params: ListParams): Promise<InvoiceList> {
  const query = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.pageSize),
  });
  if (params.status) query.set("status", params.status);
  if (params.supplier) query.set("supplier", params.supplier);
  return request<InvoiceList>(`/invoices?${query.toString()}`);
}

export function getInvoice(id: number): Promise<Invoice> {
  return request<Invoice>(`/invoices/${id}`);
}

export function createInvoice(payload: InvoiceCreatePayload): Promise<Invoice> {
  return request<Invoice>("/invoices", jsonInit("POST", payload));
}
