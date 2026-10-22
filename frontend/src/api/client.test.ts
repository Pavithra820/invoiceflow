import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, createInvoice, getMe, login, setAuthToken } from "./client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  setAuthToken(null);
});

describe("api client", () => {
  it("sends the bearer token and returns the parsed body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1, email: "a@b.co", role: "admin" }));
    vi.stubGlobal("fetch", fetchMock);
    setAuthToken("abc123");

    const me = await getMe();

    expect(me.email).toBe("a@b.co");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/me");
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer abc123");
  });

  it("sends no Authorization header when logged out", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1, email: "a@b.co", role: "admin" }));
    vi.stubGlobal("fetch", fetchMock);

    await getMe();

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Headers).has("Authorization")).toBe(false);
  });

  it("logs in with form data, as the backend expects", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ access_token: "t", token_type: "bearer" }));
    vi.stubGlobal("fetch", fetchMock);

    await login("a@b.co", "secret-password");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBeInstanceOf(URLSearchParams);
    expect((init.body as URLSearchParams).get("username")).toBe("a@b.co");
  });

  it("turns a text error from the API into an ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "Invoice already exists for this supplier" }, 409)));

    await expect(
      createInvoice({
        supplier_name: "A",
        invoice_number: "1",
        issue_date: "2026-01-01",
        due_date: null,
        currency: "EUR",
        total_amount: "1.00",
        line_items: [],
      }),
    ).rejects.toMatchObject({ status: 409, message: "Invoice already exists for this supplier" });
  });

  it("joins validation messages when the API returns a list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: [{ msg: "first problem" }, { msg: "second problem" }] }, 422)),
    );
    await expect(getMe()).rejects.toThrow("first problem; second problem");
  });

  it("explains when the server cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const error = await getMe().catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
  });
});
