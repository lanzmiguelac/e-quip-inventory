// @vitest-environment jsdom
// @vitest-environment-options {"url":"http://localhost/"}
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Login } from "../src/features/auth/Login";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("presents Google first and explains administrator-approved access", () => {
  render(<Login initialError="" />);
  expect(
    screen.getByRole("button", { name: "Continue with Google" }),
  ).toBeTruthy();
  expect(screen.getByLabelText("Email address")).toBeTruthy();
  expect(
    screen.getByText("Only administrator-approved accounts can access E-QUIP."),
  ).toBeTruthy();
});
it("shows a useful error when Google is not configured and restores the button", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ external: { google: false } }), {
      status: 200,
    }),
  );
  render(<Login initialError="" />);
  await userEvent.click(
    screen.getByRole("button", { name: "Continue with Google" }),
  );
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Google sign-in is not enabled yet",
  );
  expect(
    screen
      .getByRole("button", { name: "Continue with Google" })
      .hasAttribute("disabled"),
  ).toBe(false);
});
