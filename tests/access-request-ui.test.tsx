// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://equip.test/"}
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccessRequestPage } from "../src/features/auth/AccessRequestPage";
const api = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("../src/lib/supabase", () => ({ rpc: api.rpc }));
const refresh = vi.fn(async () => {}),
  signOut = vi.fn(async () => {});
const request = {
  id: "request-1",
  user_id: "user-1",
  email: "student@gmail.com",
  full_name: "ICCT Student",
  school_id: "ICCT-123",
  reason: "For class",
  status: "Pending",
  requested_at: "2026-11-07T08:00:00Z",
  reviewed_at: null,
  reviewer_id: null,
  decision_note: "",
};
beforeEach(() => {
  api.rpc.mockReset();
  refresh.mockClear();
  signOut.mockClear();
});
afterEach(cleanup);
it("submits details without accepting an email or privileged role from the browser", async () => {
  let pending = false;
  api.rpc.mockImplementation(async (name) =>
    name === "access_request_status"
      ? { eligible: true, request: pending ? request : null }
      : ((pending = true), "request-1"),
  );
  render(
    <AccessRequestPage
      email="student@gmail.com"
      defaultName="ICCT Student"
      onRefresh={refresh}
      onSignOut={signOut}
    />,
  );
  await screen.findByRole("button", { name: "Request access" });
  await userEvent.type(screen.getByLabelText("School ID"), "ICCT-123");
  await userEvent.type(
    screen.getByLabelText("Message (optional)"),
    "For class",
  );
  await userEvent.click(screen.getByRole("button", { name: "Request access" }));
  await screen.findByRole("heading", { name: "Request pending" });
  expect(api.rpc).toHaveBeenCalledWith("submit_access_request", {
    p_full_name: "ICCT Student",
    p_school_id: "ICCT-123",
    p_reason: "For class",
  });
  expect(screen.queryByRole("button", { name: "Request access" })).toBeNull();
});
it("shows a decline reason without offering duplicate submissions", async () => {
  api.rpc.mockResolvedValue({
    eligible: true,
    request: {
      ...request,
      status: "Declined",
      decision_note: "School ID could not be verified",
    },
  });
  render(
    <AccessRequestPage
      email="student@gmail.com"
      onRefresh={refresh}
      onSignOut={signOut}
    />,
  );
  await screen.findByRole("heading", { name: "Request declined" });
  expect(screen.getByText("School ID could not be verified")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Request access" })).toBeNull();
});
it("refreshes application access after approval using the same session", async () => {
  api.rpc.mockResolvedValue({
    eligible: false,
    request: { ...request, status: "Approved" },
  });
  render(
    <AccessRequestPage
      email="student@gmail.com"
      onRefresh={refresh}
      onSignOut={signOut}
    />,
  );
  await waitFor(() => expect(refresh).toHaveBeenCalled());
});
it("does not show an access form to an ineligible account", async () => {
  api.rpc.mockResolvedValue({ eligible: false, request: null });
  render(
    <AccessRequestPage
      email="student@example.com"
      onRefresh={refresh}
      onSignOut={signOut}
    />,
  );
  await screen.findByText("Sign in with Google to request access.");
  expect(screen.queryByRole("button", { name: "Request access" })).toBeNull();
});
