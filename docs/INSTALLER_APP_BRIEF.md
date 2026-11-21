# SolarMatch Installers mobile app: brief for a new builder

Written 21 November 2026 from the code on `main`. Where this brief and the code disagree, the code wins.

## What SolarMatch is

SolarMatch Thailand is a Thai-first, English-parity website for homeowners in Greater Bangkok and Thailand.

- **Homeowners** answer a short assessment (bill, home, roof, daytime use) and get a free rooftop-solar planning estimate: system size, planning price, monthly saving, simple payback and a 25-year cost chart. The estimate never depends on giving contact details.
- **Installers** (solar installation companies) can sign up to receive homeowner enquiries from people who chose to be contacted. Each homeowner is shared with at most 3 companies. Installers pay per enquiry using prepaid credits.

The app to build is for **installers**: the installer portal on a phone.

## Links

- Website: https://solarmatch-thailand.deluxejahseh.workers.dev (Thai at `/`, English at `/en`)
- Installer landing page: https://solarmatch-thailand.deluxejahseh.workers.dev/installers (add `?lang=en` for English)
- Repository (public): https://github.com/gvrshabd/solarmatch-thailand, branch `main`

## Stack

- Next.js App Router (React 19) compiled with **vinext** and deployed as one **Cloudflare Worker** (`solarmatch-thailand`).
- **Cloudflare D1** (SQLite) database, binding `DB`; private **R2** bucket, binding `MEDIA`. Schema lives in `migrations/`.
- TypeScript, Zod, lucide-react icons. Tests: Vitest (`tests/unit`) and Playwright (`tests/e2e`).
- Installer sign-in: **Better Auth**, email and password (12+ characters), email verification required, cookie sessions (`solarmatch_installer` prefix, 30 days).
- Providers, all coded but **not live**: Omise (credit purchases by card, PromptPay, TrueMoney or mobile banking), LINE Messaging API (new-enquiry alerts and account linking), Resend (auth email), Twilio (homeowner SMS codes).
- Commands: `pnpm install`, `pnpm db:migrate:local`, `pnpm dev` (http://localhost:3000), `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`.

## What installers can do today (web portal at `/installers`)

- Register, verify email, sign in, reset password.
- Create the company profile: name, contact person, phone, service provinces and districts, supported products, daily enquiry limit. Accept the versioned installer terms.
- Pause or resume receiving new enquiries.
- See enquiries ("deliveries") with the homeowner's name, phone, area, assessment answers and qualification. Each one has a claim deadline.
- Record progress: `contacted`, `site_visit`, `quoted`, `won`, `lost`, `not-suitable`.
- Write shared team notes per enquiry (revision-checked, so two people can't overwrite each other).
- Create, rotate or revoke an expiring staff share link for one enquiry.
- Claim an invalid enquiry within the claim window (7 days by default). An approved claim restores the credits; it is not a cash refund.
- Buy credits (`credits-20` package) through Omise, and see balance, trial enquiries left, orders and the credit ledger.
- Link or unlink a LINE account for new-enquiry alerts.

Business rules (admin-configurable in `lib/installer/settings.ts`): up to 3 companies per homeowner, 2 free trial enquiries, credit cost per enquiry, claim window. Read the values from the API rather than hard-coding them.

## Backend the app would talk to

- Auth: `/api/installer-auth/*` (Better Auth). Config in `lib/installer/auth.ts`.
- Portal data: `GET /api/installer/portal` (optional `?deliveryId=`). Returns `InstallerPortalData`.
- Portal actions: `POST /api/installer/portal` with JSON `{ action, ... }`. Actions: `create-company`, `update-company`, `set-accepting`, `accept-terms`, `checkout`, `authorize-payment`, `reconcile-order`, `create-claim`, `rotate-share-link`, `revoke-share-link`, `report-outcome`, `save-team-notes`, `link-line`, `unlink-line`.
- Types for both: `lib/installer/portal-contract.ts`. Route: `app/api/installer/portal/route.ts`.
- Other routes: `app/api/installer/payment-status`, `share`, and the signed `webhooks/line` and `webhooks/payment`.

### Constraints that matter for a phone app

1. **The installer platform is switched off in production.** `wrangler.jsonc` has `INSTALLER_PLATFORM_MODE: "off"`, so the live portal API answers `platform_unavailable`. It runs in `local-test` mode on localhost and in a protected staging deployment. Build and test against local mode with synthetic data (`docs/installer-demo-local.md`).
2. **The API is web-only by design.** In sandbox and production, every request must come from the exact `INSTALLER_BASE_URL` origin. POSTs need an `Origin` header equal to the site origin and `Content-Type: application/json`. Sessions are httpOnly cookies. A native app calling the API from its own origin will be refused.
3. So pick one of these and say which:
   - **A. Installable web app (PWA) or a thin native shell** (Capacitor or Expo WebView) around `/installers`. No backend auth changes, fastest. Push alerts via LINE, which is already built.
   - **B. A real native app** (React Native/Expo or Swift/Kotlin). Needs a reviewed, token-based mobile auth path and API changes in this repo. Never loosen the existing origin, CSRF or cookie checks to make it work.

## Design and language

- Thai first, with full English parity in every screen. Thai copy marked "needs native review" is a draft.
- Brand tokens are in `app/design-v2-tokens.css` (`--sm-pine #142D26`, `--sm-lime #D6EF91`, `--sm-gold #E2A62B`, `--sm-green #137A50`, `--sm-stone #F5F4EF`). Fonts: Manrope and Anuphan.
- Installer visual style: the "Pulse" landing (`components/installers/landing.tsx`, `app/installers-signal.css`) and the portal (`components/installers/portal.tsx`, `workspace.tsx`, `enquiry-detail.tsx`).
- Respect `prefers-reduced-motion`.

## Do not

- Deploy, run remote D1 migrations, or change `wrangler.jsonc`, DNS, Cloudflare Access or provider accounts. Production changes are owner-approved steps.
- Turn on any live provider (`*_LIVE_ENABLED`, payments, SMS, LINE, email) or real data collection.
- Commit secrets. Use real homeowner data in tests. Invent company, legal, tax or pricing facts.
- Touch any other project's repository, Worker or storage.

Work on a feature branch and open a pull request into `main`.

## Read next

- `docs/INSTALLER_IMPLEMENTATION_STATUS.md`, `docs/INSTALLER_REMAINING_WORK.md`, `docs/launch-readiness/README.md`: what is built and what is still blocked.
- `docs/INSTALLER_PROVIDER_SETUP.md`: Omise, LINE, Resend and Twilio setup.
- `docs/installer-demo-local.md`, `docs/installer-local-test.md`: run the portal locally with synthetic data.
- `docs/SECURITY.md`, `ARCHITECTURE.md`.

Still waiting on the owner: company and legal details, VAT and invoices, Omise merchant approval, a LINE Official Account, a verified email sender, and Thai SMS delivery.
