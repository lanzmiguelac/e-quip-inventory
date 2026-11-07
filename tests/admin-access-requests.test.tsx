// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccessRequests } from "../src/features/users/AccessRequests";
import { AppContext, type AppContextValue } from "../src/lib/context";
const api = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("../src/lib/supabase", () => ({ rpc: api.rpc }));
const request = {
  id: "access-1",
  user_id: "google-1",
  email: "student@gmail.com",
  full_name: "ICCT Student",
  school_id: "ICCT-123",
  reason: "Class equipment",
  status: "Pending",
  requested_at: "2026-11-07T08:00:00Z",
  decision_note: "",
};
const context: AppContextValue = {
  profile: {
    id: "admin",
    full_name: "Admin",
    email: "admin@test.com",
    school_id: "A",
    role: "admin",
    is_active: true,
  },
  data: {
    equipment: [],
    requests: [],
    loans: [],
    maintenance: [],
    notifications: [],
    profiles: [],
    audit: [],
  },
  perform: async (action) => {
    await action();
  },
  refresh: async () => {},
  navigate: () => {},
};
beforeEach(() => {
  api.rpc.mockReset();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);
it("shows a pending Google request and approves it as a borrower", async () => {
  let approved = false;
  api.rpc.mockImplementation(async (name) =>
    name === "list_access_requests"
      ? [{ ...request, status: approved ? "Approved" : "Pending" }]
      : (approved = true),
  );
  render(
    <AppContext.Provider value={context}>
      <AccessRequests />
    </AppContext.Provider>,
  );
  await screen.findByText("student@gmail.com");
  await userEvent.click(screen.getByRole("button", { name: "Approve" }));
  await userEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Approve as borrower",
    }),
  );
  await screen.findByText("No pending access requests");
  expect(api.rpc).toHaveBeenCalledWith("review_access_request", {
    p_id: "access-1",
    p_decision: "Approved",
    p_note: "",
  });
});
it("requires and sends a decline reason", async () => {
  let declined = false;
  api.rpc.mockImplementation(async (name) =>
    name === "list_access_requests"
      ? [{ ...request, status: declined ? "Declined" : "Pending" }]
      : (declined = true),
  );
  render(
    <AppContext.Provider value={context}>
      <AccessRequests />
    </AppContext.Provider>,
  );
  await screen.findByText("student@gmail.com");
  await userEvent.click(screen.getByRole("button", { name: "Decline" }));
  const dialog = screen.getByRole("dialog");
  await userEvent.type(
    within(dialog).getByLabelText("Reason for declining"),
    "School ID could not be verified",
  );
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Decline request" }),
  );
  await screen.findByText("No pending access requests");
  expect(api.rpc).toHaveBeenCalledWith("review_access_request", {
    p_id: "access-1",
    p_decision: "Declined",
    p_note: "School ID could not be verified",
  });
});
