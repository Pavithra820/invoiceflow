import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError, createInvoice } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { formatCents, lineAmountCents } from "../lib/money";
import { emptyLineItem, toPayload, validateInvoiceForm } from "../lib/validation";
import type { FormErrors, InvoiceForm, LineItemForm } from "../lib/validation";

const initialForm = (): InvoiceForm => ({
  supplierName: "",
  invoiceNumber: "",
  issueDate: "",
  dueDate: "",
  currency: "EUR",
  totalAmount: "",
  lineItems: [emptyLineItem()],
});

export default function NewInvoicePage() {
  const { canCreate } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<InvoiceForm>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!canCreate) {
    return (
      <>
        <p role="alert" className="error">
          Your role does not allow creating invoices. Ask an admin to make you a reviewer.
        </p>
        <Link to="/invoices">Back to invoices</Link>
      </>
    );
  }

  function setField<K extends keyof InvoiceForm>(field: K, value: InvoiceForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function setLine(index: number, field: keyof LineItemForm, value: string) {
    setForm((current) => ({
      ...current,
      lineItems: current.lineItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  }

  function addLine() {
    setForm((current) => ({ ...current, lineItems: [...current.lineItems, emptyLineItem()] }));
  }

  function removeLine(index: number) {
    setForm((current) => ({ ...current, lineItems: current.lineItems.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setServerError(null);
    const found = validateInvoiceForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const created = await createInvoice(toPayload(form));
      navigate(`/invoices/${created.id}`);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not save the invoice");
    } finally {
      setSubmitting(false);
    }
  }

  const linesTotal = form.lineItems.reduce((sum, item) => sum + (lineAmountCents(item.quantity, item.unitPrice) ?? 0), 0);

  const fieldError = (key: string) =>
    errors[key] ? (
      <p role="alert" className="error small">
        {errors[key]}
      </p>
    ) : null;

  return (
    <>
      <p>
        <Link to="/invoices">← Back to invoices</Link>
      </p>
      <h1>New invoice</h1>

      <form className="card" onSubmit={handleSubmit} noValidate>
        <div className="grid">
          <div>
            <label htmlFor="supplier">Supplier</label>
            <input id="supplier" value={form.supplierName} onChange={(e) => setField("supplierName", e.target.value)} />
            {fieldError("supplierName")}
          </div>
          <div>
            <label htmlFor="number">Invoice number</label>
            <input id="number" value={form.invoiceNumber} onChange={(e) => setField("invoiceNumber", e.target.value)} />
            {fieldError("invoiceNumber")}
          </div>
          <div>
            <label htmlFor="issue">Issue date</label>
            <input id="issue" type="date" value={form.issueDate} onChange={(e) => setField("issueDate", e.target.value)} />
            {fieldError("issueDate")}
          </div>
          <div>
            <label htmlFor="due">Due date (optional)</label>
            <input id="due" type="date" value={form.dueDate} onChange={(e) => setField("dueDate", e.target.value)} />
            {fieldError("dueDate")}
          </div>
          <div>
            <label htmlFor="currency">Currency</label>
            <input
              id="currency"
              value={form.currency}
              maxLength={3}
              onChange={(e) => setField("currency", e.target.value.toUpperCase())}
            />
            {fieldError("currency")}
          </div>
          <div>
            <label htmlFor="total">Total amount</label>
            <input
              id="total"
              inputMode="decimal"
              placeholder="25.50"
              value={form.totalAmount}
              onChange={(e) => setField("totalAmount", e.target.value)}
            />
            {fieldError("totalAmount")}
          </div>
        </div>

        <h2>Line items</h2>
        {form.lineItems.map((item, index) => (
          <div className="line-row" key={index}>
            <div className="line-description">
              <input
                aria-label={`Description ${index + 1}`}
                placeholder="Description"
                value={item.description}
                onChange={(e) => setLine(index, "description", e.target.value)}
              />
              {fieldError(`lineItems.${index}.description`)}
            </div>
            <div>
              <input
                aria-label={`Quantity ${index + 1}`}
                placeholder="Qty"
                inputMode="decimal"
                value={item.quantity}
                onChange={(e) => setLine(index, "quantity", e.target.value)}
              />
              {fieldError(`lineItems.${index}.quantity`)}
            </div>
            <div>
              <input
                aria-label={`Unit price ${index + 1}`}
                placeholder="Unit price"
                inputMode="decimal"
                value={item.unitPrice}
                onChange={(e) => setLine(index, "unitPrice", e.target.value)}
              />
              {fieldError(`lineItems.${index}.unitPrice`)}
            </div>
            <div className="line-amount">{formatCents(lineAmountCents(item.quantity, item.unitPrice) ?? 0)}</div>
            <button type="button" className="button button-secondary" onClick={() => removeLine(index)}>
              Remove
            </button>
          </div>
        ))}

        <button type="button" className="button button-secondary" onClick={addLine}>
          Add line item
        </button>
        <p className="hint">Line items add up to {formatCents(linesTotal)}. They must match the total.</p>

        {serverError && (
          <p role="alert" className="error">
            {serverError}
          </p>
        )}

        <button className="button" type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save invoice"}
        </button>
      </form>
    </>
  );
}
