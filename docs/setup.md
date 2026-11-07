# E-QUIP setup

E-QUIP is a React/Vite/TypeScript application with a real Supabase PostgreSQL database, Auth, private photo storage, and an authenticated account-management Edge Function. It follows E-QUIP-final.html's navy-and-blue visual identity. All school calendar rules use Asia/Manila (UTC+8).

## Run the prepared project

1. Install Node.js 22.12+ or 24 LTS.
2. Run `npm ci`.
3. Copy `.env.example` to `.env`. Supply your Supabase project URL and publishable key. These two values are public identifiers, not administrator secrets.
4. Run `npm run dev`, then open the URL Vite prints.
5. Sign in using a prepared account. The working database's initial demonstration credentials are supplied separately; they are not committed to the source.

No equipment or borrowing records are stored in localStorage. Supabase Auth may persist its session in browser storage. Sign out on shared devices.

## Prepare a different Supabase project

Use a dedicated demonstration project. Never apply these migrations over an unrelated database.

1. Apply the migrations under `supabase/migrations` in filename order through Supabase migrations or the SQL editor. They create tables, constrained transaction functions, permissions, and a private equipment-photo bucket.
2. Deploy `supabase/functions/manage-users/index.ts` as the `manage-users` Edge Function. Gateway JWT verification is disabled because this function validates the bearer token itself with Auth getUser, then verifies the caller's current active administrator profile. Its built-in SUPABASE_SERVICE_ROLE_KEY stays on the server.
3. For the first accounts, set SUPABASE_SERVICE_ROLE_KEY and DEMO_PASSWORD in your ignored local `.env`, and run `node --env-file=.env scripts/seed-demo.mjs`. The script creates four fictional accounts and does not overwrite existing accounts. Remove the service key from local configuration when finished.
4. Run `supabase/seed.sql` to add six fictional assets.
5. Disable public signup in your project's Auth settings if you do not want uninvited Auth accounts. Such accounts have no application profile and cannot access application data even if signup is enabled.
6. Enable compromised-password protection when available on your Supabase plan. The prepared free project reports this option as disabled.
7. Point the frontend's public environment variables at your new project and rebuild.

## Commands and verification

- `npm run build`: TypeScript checking and production build.
- `npm run test:unit`: Philippine-date and CSV-export checks, no database required.
- `npm test`: unit tests plus DOM-based UI tests against the real configured demonstration database. Requires its four demo accounts to use DEMO_PASSWORD.
- `npm run test:integration`: API permission, workflow, simultaneous approval, duplicate handover, maintenance, and account-activation checks.
- `npm run test:storage`: staff-only uploads, private reads, and allowed image types.
- `npm run test:accounts`: protected Edge Function creation/password-reset tests.

Run live integration tests only against a disposable demonstration project: they create clearly marked test records and fictional users. In the managed cloud environment, use NODE_USE_ENV_PROXY=1 so Node respects the supplied network proxy. This is not needed in an ordinary local environment.

DOM tests do not replace visual browser checks or camera checks on an actual phone. Those checks remain necessary before a school presentation.

## Build and hosting

Run `npm run build` and host `dist/` on an HTTPS static host. Routes use hashes (for example `/#/equipment/<id>`), so QR links and refreshes work without special server rewrites. QR labels use the domain at generation time; regenerate them if the application's domain changes.

The GitHub repository uses vercel.json for the connected Vercel deployment. See docs/vercel-deployment.md for environment variables and Google redirect configuration. The earlier Sites copy is maintained separately.

Never put service-role keys, account passwords, or database credentials in VITE_ variables. They would be included in browser JavaScript.

## Data and maintenance

Database writes use explicitly granted RPCs with current-role checks. Sensitive implementations live in a private schema and run atomically. Browser clients have no general table-write grants. Asset-row locks, a unique active reservation index, and a unique open-loan index prevent conflicts. Internal audit/notification helpers cannot be called by authenticated clients.

An approved reservation remains until staff releases it or someone authorized cancels it. A loan is overdue after its due date ends in Philippine Time. Returning Needs Repair equipment requires an incident description and opens maintenance automatically. All open incidents must be resolved before equipment can leave maintenance. Archived assets and inactive users retain their history.

Reports use Philippine calendar dates and escape spreadsheet-formula prefixes in user-entered cells. Reports never change borrowing state.

Photos are limited to JPEG/PNG/WebP, maximum 5 MB, and use signed URLs. This version does not process email/SMS, fines, recurring reminders, multiple schools, or requests with multiple assets. It requires internet access. Check the provider's current free-plan limits before extended use; this implementation does not enable a paid plan.
