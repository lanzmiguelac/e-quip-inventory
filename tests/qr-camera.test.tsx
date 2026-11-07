// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://equip.test/"}
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { QRPage } from "../src/features/QR";
import { AppContext, type AppContextValue } from "../src/lib/context";
const camera = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  success: null as null | ((text: string) => void),
  isScanning: false,
}));
vi.mock("html5-qrcode", () => ({
  Html5Qrcode: class {
    get isScanning() {
      return camera.isScanning;
    }
    async start(...args: unknown[]) {
      camera.success = args[2] as (text: string) => void;
      await camera.start(...args);
      camera.isScanning = true;
    }
    async stop() {
      await camera.stop();
      camera.isScanning = false;
    }
  },
}));
const context: AppContextValue = {
  profile: {
    id: "test",
    full_name: "Test",
    email: "test@example.com",
    school_id: "TEST",
    role: "staff",
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
  refresh: async () => {},
  perform: async () => {},
  navigate: vi.fn(),
};
beforeEach(() => {
  camera.start.mockReset().mockResolvedValue(null);
  camera.stop.mockReset().mockResolvedValue(null);
  camera.isScanning = false;
  const css = document.createElement("style");
  css.dataset.test = "scanner-css";
  css.textContent = readFileSync("src/styles.css", "utf8");
  document.head.appendChild(css);
});
afterEach(() => {
  cleanup();
  document
    .querySelectorAll('style[data-test="scanner-css"]')
    .forEach((s) => s.remove());
});
it("keeps the empty camera container visible before the library measures it", () => {
  render(
    <AppContext.Provider value={context}>
      <QRPage />
    </AppContext.Provider>,
  );
  expect(
    getComputedStyle(document.getElementById("camera-scanner")!).display,
  ).not.toBe("none");
});
it("starts, displays, stops, and restarts the preview using a scan area that fits a small camera frame", async () => {
  render(
    <AppContext.Provider value={context}>
      <QRPage />
    </AppContext.Provider>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Start camera" }));
  await screen.findByRole("button", { name: "Stop camera" });
  const configuration = camera.start.mock.calls[0][1];
  expect(typeof configuration.qrbox).toBe("function");
  const box = configuration.qrbox(260, 180);
  expect(box.width).toBeLessThanOrEqual(180);
  expect(box.height).toBeLessThanOrEqual(180);
  await userEvent.click(screen.getByRole("button", { name: "Stop camera" }));
  await screen.findByRole("button", { name: "Start camera" });
  expect(camera.stop).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole("button", { name: "Start camera" }));
  await screen.findByRole("button", { name: "Stop camera" });
  expect(camera.start).toHaveBeenCalledTimes(2);
});
it("explains a permission denial and permits retry", async () => {
  camera.start.mockRejectedValueOnce(
    "Error getting userMedia, error = NotAllowedError: Permission denied",
  );
  render(
    <AppContext.Provider value={context}>
      <QRPage />
    </AppContext.Provider>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Start camera" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Camera permission was denied",
  );
  await userEvent.click(screen.getByRole("button", { name: "Start camera" }));
  await screen.findByRole("button", { name: "Stop camera" });
});
it("stops an active camera when leaving the page", async () => {
  const page = render(
    <AppContext.Provider value={context}>
      <QRPage />
    </AppContext.Provider>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Start camera" }));
  await screen.findByRole("button", { name: "Stop camera" });
  page.unmount();
  await waitFor(() => expect(camera.stop).toHaveBeenCalledTimes(1));
});
