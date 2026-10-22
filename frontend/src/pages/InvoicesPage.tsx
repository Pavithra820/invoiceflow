import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import { ApiError, listInvoices } from "../api/client";
import type { InvoiceList, InvoiceStatus } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import StatusBadge from "../components/StatusBadge";
import { formatMoney } from "../lib/money";

const PAGE_SIZE = 10;

export default function InvoicesPage() {
  const { canCreate } = useAuth();
  const [data, setData] = useState<InvoiceList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<InvoiceStatus | "">("");
  const [supplierInput, setSupplierInput] = useState("");
  const [supplier, setSupplier] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listInvoices({ page, pageSize: PAGE_SIZE, status: status || undefined, supplier: supplier || undefined })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not load invoices");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true; // ignore results of outdated requests
    };
  }, [page, status, supplier]);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSupplier(supplierInput.trim());
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <div className="page-header">
        <h1>Invoices</h1>
        {canCreate && (
          <Link to="/invoices/new" className="button">
            New invoice
          </Link>
        )}
      </div>

      <form className="filters" onSubmit={applyFilters}>
        <input
          type="search"
          placeholder="Search supplier"
          aria-label="Search supplier"
          value={supplierInput}
          onChange={(e) => setSupplierInput(e.target.value)}
        />
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as InvoiceStatus | "");
          }}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="processing">Processing</option>
          <option value="needs_review">Needs review</option>
          <option value="approved">Approved</option>
          <option value="failed">Failed</option>
        </select>
        <button className="button button-secondary" type="submit">
          Search
        </button>
      </form>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {loading && <p className="hint">Loading…</p>}

      {data && !loading && data.items.length === 0 && <p className="hint">No invoices found.</p>}

      {data && data.items.length > 0 && (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th>Supplier</th>
                <th>Issued</th>
                <th>Status</th>
                <th className="right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <Link to={`/invoices/${invoice.id}`}>{invoice.invoice_number}</Link>
                  </td>
                  <td>{invoice.supplier_name}</td>
                  <td>{invoice.issue_date}</td>
                  <td>
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="right">{formatMoney(invoice.total_amount, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > 0 && (
        <div className="pagination">
          <button className="button button-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages} ({data.total} invoices)
          </span>
          <button
            className="button button-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
