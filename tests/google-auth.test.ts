// @vitest-environment jsdom
// @vitest-environment-options {"url":"http://localhost/"}
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createGoogleSignInUrl,
  requireGoogleProvider,
  oauthErrorMessage,
  restoreOAuthRoute,
} from "../src/features/auth/googleAuth";
afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  history.replaceState({}, "", "/");
});
describe("Google authentication", () => {
  it("creates a PKCE Google flow that returns to this app and remembers the equipment link", async () => {
    const url = new URL(
      await createGoogleSignInUrl("http://localhost", "#/equipment/1234"),
    );
    expect(url.origin).toBe("https://rbzxaqjisiyjljmyeozu.supabase.co");
    expect(url.pathname).toBe("/auth/v1/authorize");
    expect(url.searchParams.get("provider")).toBe("google");
    expect(url.searchParams.get("redirect_to")).toBe("http://localhost/");
    expect(url.searchParams.get("prompt")).toBe("select_account");
    expect(url.searchParams.get("code_challenge_method")).toBe("s256");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    restoreOAuthRoute();
    expect(location.hash).toBe("#/equipment/1234");
    expect(sessionStorage.getItem("equip.oauth.return")).toBeNull();
  });
  it("does not redirect when Google has not been enabled", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ external: { google: false } }), {
        status: 200,
      }),
    );
    await expect(requireGoogleProvider()).rejects.toThrow(
      "Google sign-in is not enabled yet",
    );
  });
  it("reports a settings failure instead of starting an unknown flow", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("unavailable", { status: 503 }),
    );
    await expect(requireGoogleProvider()).rejects.toThrow(
      "Unable to check Google sign-in",
    );
  });
  it("handles denied consent from query or fragment without showing raw provider text", () => {
    expect(
      oauthErrorMessage(
        "https://app.test/?error=access_denied&error_description=private",
      ),
    ).toContain("cancelled");
    expect(oauthErrorMessage("https://app.test/#error=server_error")).toContain(
      "try again",
    );
    expect(oauthErrorMessage("https://app.test/#/inventory")).toBe("");
  });
  it("ignores stored external redirects", () => {
    sessionStorage.setItem("equip.oauth.return", "https://evil.test");
    restoreOAuthRoute();
    expect(location.origin).toBe("http://localhost");
    expect(location.hash).toBe("");
  });
});
