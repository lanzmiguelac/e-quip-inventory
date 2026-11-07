# E-QUIP

School equipment borrowing and inventory application built from E-QUIP-final.html using React, TypeScript, Vite, and Supabase.

- Secure role-based login: administrator, inventory staff, borrower.
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

See [setup](docs/setup.md), [presentation script](docs/demo-script.md), [approved design](docs/plan.md), and [verification record](docs/progress.md).

The prepared hosted demo is owner-private. Downloading the source does not change who can access that site. Use fictional data only. Visual browser and real phone camera verification remain outstanding.
