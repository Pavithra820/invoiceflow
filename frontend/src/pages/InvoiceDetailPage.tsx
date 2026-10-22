import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiError, getInvoice } from "../api/client";
import type { Invoice } from "../api/types";
import StatusBadge from "../components/StatusBadge";
import { formatMoney } from "../lib/money";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getInvoice(Number(id))
      .then((result) => {
        if (!cancelled) setInvoice(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not load the invoice");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <>
        <p role="alert" className="error">
          {error}
        </p>
        <Link to="/invoices">Back to invoices</Link>
      </>
    );
  }
  if (!invoice) return <p className="hint">Loading…</p>;

  return (
    <>
      <p>
        <Link to="/invoices">← Back to invoices</Link>
      </p>
      <div className="page-header">
        <h1>Invoice {invoice.invoice_number}</h1>
        <StatusBadge status={invoice.status} />
      </div>

      <div className="card details">
        <dl>
          <dt>Supplier</dt>
          <dd>{invoice.supplier_name}</dd>
          <dt>Issue date</dt>
          <dd>{invoice.issue_date}</dd>
          <dt>Due date</dt>
          <dd>{invoice.due_date ?? "—"}</dd>
          <dt>Total</dt>
          <dd>{formatMoney(invoice.total_amount, invoice.currency)}</dd>
        </dl>
      </div>

      <h2>Line items</h2>
      {invoice.line_items.length === 0 ? (
        <p className="hint">This invoice has no line items.</p>
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th className="right">Quantity</th>
                <th className="right">Unit price</th>
                <th className="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td className="right">{item.quantity}</td>
                  <td className="right">{formatMoney(item.unit_price, invoice.currency)}</td>
                  <td className="right">{formatMoney(item.amount, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
