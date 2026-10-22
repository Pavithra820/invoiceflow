import type { InvoiceCreatePayload } from "../api/types";
import { formatCents, lineAmountCents, parseScaled } from "./money";

export interface LineItemForm {
  description: string;
  quantity: string;
  unitPrice: string;
}

export interface InvoiceForm {
  supplierName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  totalAmount: string;
  lineItems: LineItemForm[];
}

/** Keys look like "supplierName" or "lineItems.0.quantity". */
export type FormErrors = Record<string, string>;

export const emptyLineItem = (): LineItemForm => ({ description: "", quantity: "1", unitPrice: "" });

export function validateInvoiceForm(form: InvoiceForm): FormErrors {
  // These rules mirror the backend, so users see problems before sending the request.
  const errors: FormErrors = {};

  const supplier = form.supplierName.trim();
  if (!supplier) errors.supplierName = "Supplier is required";
  else if (supplier.length > 200) errors.supplierName = "Supplier must be at most 200 characters";

  const number = form.invoiceNumber.trim();
  if (!number) errors.invoiceNumber = "Invoice number is required";
  else if (number.length > 100) errors.invoiceNumber = "Invoice number must be at most 100 characters";

  if (!form.issueDate) errors.issueDate = "Issue date is required";
  if (form.dueDate && form.issueDate && form.dueDate < form.issueDate) {
    errors.dueDate = "Due date cannot be before the issue date";
  }

  if (!/^[A-Z]{3}$/.test(form.currency)) errors.currency = "Use a 3-letter code such as EUR";

  const total = parseScaled(form.totalAmount, 2);
  if (total === null) errors.totalAmount = "Enter an amount with up to 2 decimals, e.g. 25.50";
  else if (total <= 0) errors.totalAmount = "Total must be greater than zero";

  let linesTotal = 0;
  let linesValid = true;
  form.lineItems.forEach((item, index) => {
    const key = (field: string) => `lineItems.${index}.${field}`;
    if (!item.description.trim()) {
      errors[key("description")] = "Description is required";
      linesValid = false;
    } else if (item.description.trim().length > 500) {
      errors[key("description")] = "Description must be at most 500 characters";
      linesValid = false;
    }
    const quantity = parseScaled(item.quantity, 3);
    if (quantity === null || quantity <= 0) {
      errors[key("quantity")] = "Quantity must be greater than zero";
      linesValid = false;
    }
    if (parseScaled(item.unitPrice, 2) === null) {
      errors[key("unitPrice")] = "Enter a price with up to 2 decimals";
      linesValid = false;
    }
    const amount = lineAmountCents(item.quantity, item.unitPrice);
    if (amount !== null) linesTotal += amount;
  });

  if (form.lineItems.length > 0 && linesValid && total !== null && total > 0 && linesTotal !== total) {
    errors.totalAmount = `Line items add up to ${formatCents(linesTotal)}, but the total is ${formatCents(total)}`;
  }

  return errors;
}

export function toPayload(form: InvoiceForm): InvoiceCreatePayload {
  return {
    supplier_name: form.supplierName.trim(),
    invoice_number: form.invoiceNumber.trim(),
    issue_date: form.issueDate,
    due_date: form.dueDate || null,
    currency: form.currency,
    total_amount: form.totalAmount.trim(),
    line_items: form.lineItems.map((item) => ({
      description: item.description.trim(),
      quantity: item.quantity.trim(),
      unit_price: item.unitPrice.trim(),
    })),
  };
}
