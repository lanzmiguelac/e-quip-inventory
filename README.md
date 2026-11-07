# E-QUIP

[Open application](https://e-quip-inventory.vercel.app) · [Vercel deployment guide](docs/vercel-deployment.md)

School equipment borrowing and inventory application built from E-QUIP-final.html using React, TypeScript, Vite, and Supabase.

- ICCT Colleges login with Google OAuth and email/password fallback; administrator-approved accounts only.
- Secure roles: administrator, inventory staff, borrower.
- Access requests with administrator approval/decline and requester status tracking.
- Shared inventory, equipment photos, QR labels and scanning.
- Immediate reservations on approval, atomic releases/returns, automatic overdue calculation.
- Damage/maintenance workflow, notifications, CSV reports, activity history.
- School timezone: Asia/Manila (Philippine Time, UTC+8).

## Start locally

1. Install Node.js 22.12+ or 24 LTS.
2. Run `npm ci`.
3. Copy `.env.example` to `.env`. Its public settings point to the prepared demonstration database. Replace them when using your own Supabase project.
4. Run `npm run dev`.
5. Sign in using the demonstration credentials supplied separately.

Run `npm run build` to create the static `dist/` deployment. No privileged Supabase key or password is included in this source.

The prepared project has Google enabled. New Google accounts can request administrator approval after signing in. A separate Supabase project requires its own OAuth client configuration. See [Google login setup](docs/google-login.md).

See [setup](docs/setup.md), [presentation script](docs/demo-script.md), [approved design](docs/plan.md), and [verification record](docs/progress.md).

Hosting access settings are separate from E-QUIP account approval. The source contains no private credentials. Visual browser and real phone camera verification remain outstanding.
