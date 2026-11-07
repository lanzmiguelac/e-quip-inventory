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
