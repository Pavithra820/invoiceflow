import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/client";
import { AuthContext } from "../auth/AuthContext";
import type { AuthState } from "../auth/AuthContext";
import LoginPage from "./LoginPage";

function renderLogin(overrides: Partial<AuthState> = {}) {
  const value: AuthState = {
    user: null,
    loading: false,
    canCreate: false,
    login: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    ...overrides,
  };
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return value;
}

describe("LoginPage", () => {
  it("submits the email and password", async () => {
    const auth = renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email"), "anna@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse-battery");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(auth.login).toHaveBeenCalledWith("anna@example.com", "correct-horse-battery");
  });

  it("shows the error message when login fails", async () => {
    renderLogin({ login: vi.fn().mockRejectedValue(new ApiError(401, "Incorrect email or password")) });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email"), "anna@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password");
  });

  it("switches to the registration form", async () => {
    renderLogin();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Create an account" }));

    expect(screen.getByRole("heading", { name: "Create account" })).toBeInTheDocument();
  });
});
