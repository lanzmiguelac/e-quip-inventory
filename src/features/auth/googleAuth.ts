import {
  supabase,
  supabaseUrl,
  supabasePublishableKey,
} from "../../lib/supabase";
const RETURN_KEY = "equip.oauth.return";
const safeRoute = (route: string) => /^#\/[a-zA-Z0-9/-]{0,200}$/.test(route);
export async function requireGoogleProvider() {
  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabasePublishableKey },
    });
  } catch {
    throw new Error(
      "Unable to check Google sign-in. Check your connection and try again.",
    );
  }
  if (!response.ok)
    throw new Error("Unable to check Google sign-in. Please try again.");
  const settings = await response.json();
  if (!settings.external?.google)
    throw new Error(
      "Google sign-in is not enabled yet. Please contact your administrator.",
    );
}
export async function createGoogleSignInUrl(origin: string, route: string) {
  const redirect = new URL("/", origin);
  if (!["http:", "https:"].includes(redirect.protocol))
    throw new Error("Invalid sign-in address.");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirect.href,
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw new Error(error.message);
  if (!data.url)
    throw new Error("Google sign-in could not start. Please try again.");
  try {
    if (safeRoute(route)) sessionStorage.setItem(RETURN_KEY, route);
    else sessionStorage.removeItem(RETURN_KEY);
  } catch {
    /* A blocked session store only loses the original page, not account access. */
  }
  return data.url;
}
export function restoreOAuthRoute() {
  try {
    const route = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    if (route && safeRoute(route)) location.hash = route;
  } catch {
    /* Open the default page when browser storage is unavailable. */
  }
}
export function oauthErrorMessage(address: string) {
  const url = new URL(address);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const error = url.searchParams.get("error") || fragment.get("error");
  if (!error) return "";
  return error === "access_denied"
    ? "Google sign-in was cancelled or not permitted. Please try again or contact your administrator."
    : "Google sign-in could not be completed. Please try again.";
}
