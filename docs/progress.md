# E-QUIP implementation ledger

Approved design: React/Vite + Supabase; three roles; one asset per request; approval reserves immediately; school timezone Asia/Manila. User authorized implementation and a separate zero-cost Supabase project.
Project: rbzxaqjisiyjljmyeozu. Site: appgprj_6aef094c43d08191bf378c068e078e54.
Ruling: fresh project has no existing repository or branch to isolate; initialized a dedicated feature branch in /workspace/sites/e-quip.
Ruling: cloud skills scripts are not installed on disk; track steps in this ledger and run standard package commands.
Ruling: sensitive multi-table writes use private SECURITY DEFINER functions behind explicitly granted SECURITY INVOKER RPC wrappers. Authenticated clients have read-only table access except recipient read flags. This prevents direct writes bypassing transition rules.
Preflight: requests, loans and maintenance serialize on equipment row; dashboard availability derives from protected aggregate functions so borrower RLS does not hide other borrowers' reservations.

## Verification evidence

- Six Vitest tests passed: Philippine dates/overdue boundaries, report date filtering, CSV safety, and DOM integration against real Supabase. DOM flow covered register → refresh → borrower request → staff approve → release → return.
- Live API checks passed: unauthenticated denial, borrower RLS, direct-write/self-promotion denial, invalid dates, simultaneous approvals (one winner), duplicate releases/returns, damaged returns, multiple repairs, notifications, archive history, final-administrator protection, immediate deactivation.
- Account Edge Function checks passed: account creation/login, password reset, deactivation, rejection of non-admin actions and short passwords.
- Storage checks passed: staff-only uploads, image MIME restriction, private anonymous denial, authenticated signed reads, cleanup.
- Review found missing maintenance records for initially damaged assets and stale repair retries overwriting newer condition. Both fixed; live regressions passed. A null-condition bypass of the new guard was also reproduced, fixed, and verified.
- Production TypeScript/Vite build passed. Vite emits harmless third-party lucide-react use-client directive warnings in this client-only application.
- Browser-control tool cua_repl.js is not offered in this managed environment. Per Sites managed-preview instructions no alternate browser/preview was installed or started. Actual visual and real-device camera QA remain unverified.
- Supabase security advisor reports no application-table/function issues; compromised-password protection is disabled in the free project's Auth settings. This is documented, not silently enabled on a paid plan.

Ruling: QR links use hash routes so static hosting refresh and login return work without server rewrites. Generated labels use the deployment origin; regenerate after a domain change.
Ruling: source/build helper scripts are unavailable in this executor. Use standard Git with the short-lived credential supplied through hidden stdin and package the committed build manually, retaining the native Sites save/deploy workflow.

## ICCT Google-login update

User requested a clean Google sign-in screen before GitHub/Vercel work and selected administrator-approved accounts only. User supplied https://icct.edu.ph/ as the school reference. Implemented ICCT branding and an unedited official-site wordmark, Google-first login with password fallback, PKCE OAuth, same-origin callback, original-page restoration, denial/provider-disabled messages, and an administrator Google-email approval dialog.

No schema or existing roles were changed. Approval creates a borrower profile for a verified-by-provider email identity, reusing an existing Auth account when necessary; existing profiles cannot be overwritten or implicitly reactivated. The Auth provider itself remains disabled pending owner-entered Google OAuth credentials. No secrets were requested in chat or included in source.

Verification: 13 Vitest tests passed, covering date/export rules, login DOM, PKCE URL/route/error logic, and the live password-based borrowing flow. Live Google-approval API tests passed for admin-only access, fixed borrower roles, duplicate/existing-role protection, deactivation protection, and input validation. An additional real unprofiled Auth fixture was denied, approved against its existing user ID, granted borrower access with the same session, and denied again after deactivation. Existing create/reset account checks passed. Production build passed with the previously documented dependency warnings. Independent focused review found no important issues.

Full Google consent/identity linking/callback verification remains blocked by the disabled provider; docs/google-login.md contains the exact Google/Supabase setup steps. Managed browser-control tools remain unavailable, so visual browser inspection is unverified. GitHub and Vercel were left untouched in accordance with the requested order.

## QR camera preview fix

Root cause reproduced: .scanner:empty used display:none, while html5-qrcode measures parentElement.clientWidth before appending its video and writes that value as an inline video width. The hidden empty container therefore yielded a zero-width camera preview.

Kept the scanner measurable with a persistent preview stage, placed the idle/loading placeholder over that stage, sized the video responsively, and replaced the fixed 220px QR crop with a function that fits the actual frame. Camera failures now distinguish permissions, missing devices, busy cameras, and unavailable browser contexts.

Regression checks failed before the fix for hidden container, fixed oversized crop, and generic permission error; all four camera tests passed afterward. The full non-network unit/DOM suite passed 16 tests, and the production build passed. Camera start/stop is mocked at the hardware boundary; real device/browser camera validation remains unverified because managed browser-control tools are unavailable.

## Google access-request workflow

User requested a Request access flow for unapproved Google accounts and an administrator Approve/Decline queue. Added a requester form (name, school ID, optional message), pending/declined status with decline reason, and an Access requests section in User Management. Both screens poll every 30 seconds and refresh on focus; Check status is also available. Approval creates an active borrower and refreshes the existing session into the application. Declined requests are not resubmitted automatically; administrators handle appeals manually.

Added access_requests with requester/admin-only SELECT policies and no browser table-write grants. Private explicitly granted RPC implementations derive identity/email from auth.users and auth.identities, reject non-Google/unverified/inactive accounts, serialize duplicate submissions and review decisions, require admin review, and cannot grant a privileged role. Request notification is in-app only. Existing manual account approval synchronizes the related queue record through a private profile-insert trigger.

Migration filename was generated by Supabase CLI 3.0.0. SQL regression checks failed before implementation, then passed in a rollback transaction: verified Google identity, duplicate requests, requester-only reads, denial of self-review/staff review/direct writes, approval as borrower, decline reason, inactive-account protection, and immediate same-session access. Six new DOM checks cover requesting and admin decisions. The full suite passed 23 tests; production build passed with only the previously documented dependency warnings. Focused independent review found no important issues. Security advisors showed no new application findings; the pre-existing compromised-password-protection setting is unchanged.

Google is now enabled in the project's public Auth settings. Real Google consent and visual browser/device checks remain unverified because the managed browser-control tool is not available. No GitHub/Vercel actions were taken.
