// @vitest-environment jsdom
// @vitest-environment-options {"url":"http://localhost/"}
import { afterAll, expect, it, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  within,
  cleanup,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import App from "../src/App";
import { supabase } from "../src/lib/supabase";
const password = readFileSync(".env", "utf8")
  .split("\n")
  .find((s) => s.startsWith("DEMO_PASSWORD="))!
  .slice(14);
window.scrollTo = vi.fn();
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
};
afterAll(async () => {
  cleanup();
  await supabase.auth.signOut();
});
it("renders role-specific screens against the real shared database and persists a complete handover", async () => {
  const user = userEvent.setup();
  async function login(name: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: `${name}@demo.equip.school`,
      password,
    });
    expect(error).toBeNull();
  }
  await login("admin");
  const first = render(<App />);
  await screen.findByRole("heading", { name: "Dashboard" }, { timeout: 20000 });
  await user.click(screen.getByRole("link", { name: "Equipment Inventory" }));
  await user.click(
    await screen.findByRole("button", { name: "Register equipment" }),
  );
  const dialog = screen.getByRole("dialog");
  const suffix = Date.now();
  await user.type(
    within(dialog).getByLabelText("Equipment name"),
    `UI Demo Camera ${suffix}`,
  );
  await user.type(
    within(dialog).getByLabelText("Asset number"),
    `UI-${suffix}`,
  );
  await user.type(within(dialog).getByLabelText("Location"), "Media Room");
  await user.click(
    within(dialog).getByRole("button", { name: "Register equipment" }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), {
    timeout: 20000,
  });
  expect(await screen.findByText(`UI Demo Camera ${suffix}`)).toBeTruthy();
  first.unmount();
  render(<App />);
  await screen.findByRole(
    "heading",
    { name: "Equipment Inventory" },
    { timeout: 20000 },
  );
  expect(await screen.findByText(`UI Demo Camera ${suffix}`)).toBeTruthy();
  await supabase.auth.signOut();
  await login("student");
  await screen.findByRole(
    "heading",
    { name: "Equipment Inventory" },
    { timeout: 20000 },
  );
  expect(screen.queryByRole("link", { name: "User Management" })).toBeNull();
  await user.click(screen.getByRole("link", { name: "Borrowing Requests" }));
  await user.click(await screen.findByRole("button", { name: "New request" }));
  const form = screen.getByRole("dialog");
  const option = within(form).getByRole("option", {
    name: new RegExp(`UI-${suffix}`),
  });
  await user.selectOptions(
    within(form).getByLabelText("Equipment"),
    (option as HTMLOptionElement).value,
  );
  await user.type(
    within(form).getByLabelText("Purpose"),
    "Class photography demonstration",
  );
  await user.click(
    within(form).getByRole("button", { name: "Submit request" }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), {
    timeout: 20000,
  });
  const { data: requests } = await supabase
    .from("borrow_requests")
    .select("id")
    .eq("equipment_id", (option as HTMLOptionElement).value);
  expect(requests?.length).toBe(1);
  const requestId = requests![0].id;
  await supabase.auth.signOut();
  await login("staff");
  await screen.findByRole(
    "heading",
    { name: "Borrowing Requests" },
    { timeout: 20000 },
  );
  const row = screen.getByText(`UI Demo Camera ${suffix}`).closest("tr")!;
  await user.click(within(row).getByRole("button", { name: "Approve" }));
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Approve & reserve",
    }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), {
    timeout: 20000,
  });
  const approvedRow = screen
    .getByText(`UI Demo Camera ${suffix}`)
    .closest("tr")!;
  await user.click(
    within(approvedRow).getByRole("button", { name: "Release" }),
  );
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Confirm physical release",
    }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), {
    timeout: 20000,
  });
  await user.click(screen.getByRole("link", { name: "Transactions" }));
  const loanRow = screen.getByText(`UI Demo Camera ${suffix}`).closest("tr")!;
  await user.click(
    within(loanRow).getByRole("button", { name: "Record return" }),
  );
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Confirm return",
    }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), {
    timeout: 20000,
  });
  const { data: loans } = await supabase
    .from("loans")
    .select("*")
    .eq("request_id", requestId);
  expect(loans?.[0].returned_at).toBeTruthy();
  const { data: asset } = await supabase.rpc("equipment_catalog");
  expect(
    asset.find(
      (e: { id: string }) => e.id === (option as HTMLOptionElement).value,
    ).availability,
  ).toBe("Available");
  console.log(
    "UI flow verified with real Supabase: registration, refresh, borrower request, staff approval/release/return",
  );
}, 120000);
