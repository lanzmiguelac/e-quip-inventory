# GitHub and Vercel

Repository: https://github.com/lanzmiguelac/e-quip-inventory
Production: https://e-quip-inventory.vercel.app

The repository contains the React/Vite frontend and the Supabase database/function source. Vercel builds the frontend with npm ci and npm run build, then serves dist. The application uses hash routes, so no catch-all rewrite is required. Pushes to the connected production branch main trigger Vercel deployments.

## Environment variables

The existing Vercel project has these public client settings for production, preview, and development:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

These match the prepared Supabase project. No service-role key, Google client secret, demo password, or database password belongs in frontend environment variables or Git. .env files and .vercel are ignored; .env.example contains only public settings.

## Backend

The application continues to use the existing E-QUIP Supabase project. Its database migrations and manage-users Edge Function are already deployed. A GitHub/Vercel frontend deployment does not automatically run database migrations or deploy Edge Functions. Do not reset or reseed the existing database as part of a frontend release.

For a separate Supabase project, follow docs/setup.md and docs/google-login.md.

## Google sign-in

Google's authorized callback remains:

https://rbzxaqjisiyjljmyeozu.supabase.co/auth/v1/callback

The final application return URL must be permitted in Supabase Authentication → URL Configuration:

https://e-quip-inventory.vercel.app/

Keep the existing Sites URL allowed if you still use it. For a Google JavaScript-origin allowlist, add https://e-quip-inventory.vercel.app in Google Cloud. Keep the Google client secret in Supabase only. Google test-user restrictions, if enabled in the consent screen, still apply independently of E-QUIP access approvals.

## Checks

npm run test:unit runs the local unit/DOM suite. npm test additionally runs a live database test and requires the separate demonstration-account password in an ignored local .env. Never put that password in the repository.

Use the deployment's commit SHA to verify that Vercel is serving the intended GitHub revision. Real Google consent and physical camera behavior still require a manual browser/device check.
