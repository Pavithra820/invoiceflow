// Money is handled as whole cents (integers) so we never lose precision to floating point.

/** Turns "10.50" into 1050 (scale 2) or "2.5" into 2500 (scale 3). Returns null if invalid. */
export function parseScaled(value: string, scale: number): number | null {
  const text = value.trim();
  const pattern = new RegExp(`^\\d+(\\.\\d{1,${scale}})?$`);
  if (!pattern.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  return Number(whole + fraction.padEnd(scale, "0"));
}

/** quantity (up to 3 decimals) times unit price (up to 2 decimals), rounded half up to cents. */
export function lineAmountCents(quantity: string, unitPrice: string): number | null {
  const q = parseScaled(quantity, 3);
  const p = parseScaled(unitPrice, 2);
  if (q === null || p === null) return null;
  return Math.floor((q * p + 500) / 1000);
}

export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Display helper for amounts that come from the API as strings. */
export function formatMoney(amount: string, currency: string): string {
  const value = Number(amount);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}
