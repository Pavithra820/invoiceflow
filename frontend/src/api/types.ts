export type Role = "admin" | "reviewer" | "viewer";
export type InvoiceStatus = "draft" | "processing" | "needs_review" | "approved" | "failed";

export interface User {
  id: number;
  email: string;
  role: Role;
}

export interface LineItem {
  id: number;
  description: string;
  quantity: string;
  unit_price: string;
  amount: string;
}

// Money arrives as strings (exact decimals), never as floating point numbers.
export interface Invoice {
  id: number;
  supplier_name: string;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  total_amount: string;
  status: InvoiceStatus;
  line_items: LineItem[];
  created_at: string;
}

export interface InvoiceList {
  items: Invoice[];
  total: number;
  page: number;
  page_size: number;
}

export interface InvoiceCreatePayload {
  supplier_name: string;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  total_amount: string;
  line_items: { description: string; quantity: string; unit_price: string }[];
}
