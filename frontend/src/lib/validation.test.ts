import { describe, expect, it } from "vitest";

import { toPayload, validateInvoiceForm } from "./validation";
import type { InvoiceForm } from "./validation";

const validForm = (): InvoiceForm => ({
  supplierName: "Acme GmbH",
  invoiceNumber: "INV-001",
  issueDate: "2026-01-10",
  dueDate: "2026-02-10",
  currency: "EUR",
  totalAmount: "25.50",
  lineItems: [
    { description: "Widget", quantity: "2", unitPrice: "10.00" },
    { description: "Shipping", quantity: "1", unitPrice: "5.50" },
  ],
});

describe("validateInvoiceForm", () => {
  it("accepts a valid invoice", () => {
    expect(validateInvoiceForm(validForm())).toEqual({});
  });

  it("accepts an invoice without line items", () => {
    expect(validateInvoiceForm({ ...validForm(), lineItems: [] })).toEqual({});
  });

  it("requires supplier and invoice number", () => {
    const errors = validateInvoiceForm({ ...validForm(), supplierName: "  ", invoiceNumber: "" });
    expect(errors.supplierName).toBeDefined();
    expect(errors.invoiceNumber).toBeDefined();
  });

  it("rejects a due date before the issue date", () => {
    const errors = validateInvoiceForm({ ...validForm(), dueDate: "2025-12-31" });
    expect(errors.dueDate).toBeDefined();
  });

  it("rejects a lowercase or short currency", () => {
    expect(validateInvoiceForm({ ...validForm(), currency: "eur" }).currency).toBeDefined();
    expect(validateInvoiceForm({ ...validForm(), currency: "EU" }).currency).toBeDefined();
  });

  it("rejects zero, negative and badly formatted totals", () => {
    for (const total of ["0", "-5", "abc", "1.234"]) {
      expect(validateInvoiceForm({ ...validForm(), totalAmount: total, lineItems: [] }).totalAmount).toBeDefined();
    }
  });

  it("rejects line items that do not add up to the total", () => {
    const errors = validateInvoiceForm({ ...validForm(), totalAmount: "99.99" });
    expect(errors.totalAmount).toContain("25.50");
  });

  it("reports problems on the specific line item", () => {
    const form = validForm();
    form.lineItems[1] = { description: "", quantity: "0", unitPrice: "abc" };
    const errors = validateInvoiceForm(form);
    expect(errors["lineItems.1.description"]).toBeDefined();
    expect(errors["lineItems.1.quantity"]).toBeDefined();
    expect(errors["lineItems.1.unitPrice"]).toBeDefined();
    expect(errors["lineItems.0.description"]).toBeUndefined();
  });
});

describe("toPayload", () => {
  it("trims text and turns an empty due date into null", () => {
    const payload = toPayload({ ...validForm(), supplierName: "  Acme GmbH ", dueDate: "" });
    expect(payload.supplier_name).toBe("Acme GmbH");
    expect(payload.due_date).toBeNull();
    expect(payload.line_items[0]).toEqual({ description: "Widget", quantity: "2", unit_price: "10.00" });
  });
});
