# ICCT Colleges Google sign-in

## Approved behavior

The login screen uses ICCT Colleges branding with Continue with Google first and email/password as a fallback for existing demonstration accounts. Only an active administrator-approved application account may access school records. After Google sign-in, an unapproved user can submit an access request with their name, school ID, and an optional message. Administrators approve or decline requests in User Management; declined users see the reason. No email-domain shortcut grants access. New Google approvals create borrowers; administrators separately manage staff roles.

Supabase handles Google's identity verification with a PKCE OAuth flow. Google returns to the same application origin. The previous in-app equipment link is restored from session storage; external redirect targets are ignored. Denied consent and disabled-provider errors are shown on the login screen. No Google client secret is included in the browser or repository.

## Provider status

Google is enabled in the prepared Supabase project. The steps below are retained for a separate project or a future hosting change. Real Google consent and callback behavior have not been exercised by the agent because managed browser controls are unavailable.

Do not paste client secrets into chat, commit them, or place them in VITE_ variables. Enter them directly in Supabase's Google provider settings.

## Enable the Google provider

1. Open https://console.cloud.google.com/auth/overview and select or create a Google Cloud project for this school demonstration.
2. Configure the Google consent screen. Use the app name E-QUIP (ICCT school project). Request only openid, email, and profile. For an External app in Testing mode, add the Google addresses that will test the demonstration under Audience → Test users. School administrator approval and Google's test-user list are separate checks.
3. Under Clients, create an OAuth client of type Web application. Set the authorized JavaScript origin to the host you are actually using:
   - Current hosted application: https://e-quip-school.jbulalacao86.chatgpt.site
   - Local development: http://localhost:5173
   - Future Vercel deployment: its exact HTTPS origin, after that deployment exists.
4. Set this exact Authorized redirect URI in Google:

   https://rbzxaqjisiyjljmyeozu.supabase.co/auth/v1/callback

5. Open https://supabase.com/dashboard/project/rbzxaqjisiyjljmyeozu/auth/providers, choose Google, enable it, and enter the client ID and secret from Google directly into that dashboard.
6. Under Supabase Authentication → URL Configuration, set the current Site URL and allow the exact return URL:

   https://e-quip-school.jbulalacao86.chatgpt.site/

   Add http://localhost:5173/ for local development. Add the final Vercel root URL when it exists. Avoid a broad production redirect wildcard.

7. Sign in with an unapproved Google account. On Request access, enter a full name, school ID, and optional message. Submit once; the page shows Pending. The account cannot read equipment or borrowing records while pending.
8. As administrator, open User Management → Access requests. Review the email, school ID, and message. Approve creates a borrower account; Decline requires a reason. The requester sees the result without signing in again. Repeated submissions reuse the same request. Declined users must contact an administrator to appeal.
9. Administrators can still preapprove an email under Approve Google account. Existing account tools synchronize any related request to Approved. Only administrators can assign staff access through Manage.
10. Sign out and choose Continue with Google using the approved address. Confirm the borrower dashboard opens. Try a different unapproved Google account and confirm application data remains blocked. Deactivate the approved account and confirm an existing session loses data access.

Existing active accounts with matching verified email can use Supabase's automatic identity linking. Existing roles are preserved. Approve Google account refuses to overwrite or reactivate existing profiles; use Manage explicitly for those changes.

Site hosting access is separate from E-QUIP account permissions. The current site's configured audience is preserved; application data still requires an approved active account.

## Verification

- Unit/DOM tests exercise the Google-first screen, disabled-provider recovery, PKCE authorize URL, same-origin return, original-route restoration, and consent error messages.
- Live Edge Function checks exercise admin-only approval, fixed borrower role, duplicate/existing-role protection, deactivation protection, and invalid inputs.
- Existing email/password and borrowing flow checks remain in the full suite.
- SQL rollback tests cover trusted Google identity checks, duplicate requests, requester-only reads, denial of self-approval and staff review, approval/decline, inactive-account protection, and access with the existing session. DOM tests cover both requester and administrator screens.
- Google consent, redirect, and sign-in with a real Google identity remain unverified. Browser/camera tooling availability is unchanged.

## Branding source

School name verified from https://icct.edu.ph/ (Home — ICCT Colleges Foundation Inc.). Login wordmark copied without editing from https://icct.edu.ph/wp-content/uploads/2026/04/logo-icct-new-1.png to public/branding/icct-logo.png. The interface identifies itself as a school project demonstration.

## GitHub and Vercel

No GitHub repository or Vercel deployment is created by this login change. When requested, the project remains a Vite static application: npm ci, npm run build, output directory dist. Vercel will need the two public VITE_SUPABASE_* environment variables and its final root URL added to Supabase's redirect allowlist. Google client secrets remain in Supabase only.
