import { describe, expect, it } from "vitest";

import { formatCents, lineAmountCents, parseScaled } from "./money";

describe("parseScaled", () => {
  it("turns decimal text into whole units", () => {
    expect(parseScaled("10.50", 2)).toBe(1050);
    expect(parseScaled("10.5", 2)).toBe(1050);
    expect(parseScaled("10", 2)).toBe(1000);
    expect(parseScaled("2.125", 3)).toBe(2125);
  });

  it("rejects bad input", () => {
    expect(parseScaled("", 2)).toBeNull();
    expect(parseScaled("abc", 2)).toBeNull();
    expect(parseScaled("-1", 2)).toBeNull();
    expect(parseScaled("1.234", 2)).toBeNull();
    expect(parseScaled("1,50", 2)).toBeNull();
  });
});

describe("lineAmountCents", () => {
  it("multiplies quantity and price exactly", () => {
    expect(lineAmountCents("2", "10.00")).toBe(2000);
    expect(lineAmountCents("1", "5.50")).toBe(550);
  });

  it("avoids floating point errors", () => {
    expect(lineAmountCents("3", "0.10")).toBe(30);
  });

  it("rounds half up to the nearest cent", () => {
    expect(lineAmountCents("0.333", "1.00")).toBe(33);
    expect(lineAmountCents("0.5", "0.01")).toBe(1);
  });

  it("returns null for invalid input", () => {
    expect(lineAmountCents("x", "1.00")).toBeNull();
  });
});

describe("formatCents", () => {
  it("formats with two decimals", () => {
    expect(formatCents(2550)).toBe("25.50");
    expect(formatCents(5)).toBe("0.05");
  });
});
