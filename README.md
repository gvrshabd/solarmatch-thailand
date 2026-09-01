# SolarMatch Thailand

Thai-first residential solar assessment and consent-aware lead-validation system. English routes mirror the public experience under `/en`; the private administration area is under `/admin/`.

## Current production posture

- The assessment and calculator are functional. Results are preliminary planning estimates—not an engineering design, quotation, or savings guarantee.
- After the ten-question assessment is calculated, the public journey can optionally ask about contact, prepare the result for 3–5 seconds with one cited solar fact, and then show the full result. Declining or abandoning contact never blocks the result.
- Contact collection has three versioned modes: `disabled`, `validation_interest`, and `named_installer_handoff`.
- Production remains `disabled`. The current release issues no assessment-submission token and renders no PII fields because legal operator, privacy-contact, and retention requirements are incomplete.
- D1 is authoritative for published questionnaire, scoring, contact, and fact-set versions; releases; consented submissions; audit history; and export state.
- The private R2 bucket stores only approved administrator media. Structured leads never use R2.
- `/admin*` is protected by Cloudflare Access and an application-level exact email allowlist. State-changing actions also require same-origin CSRF validation.
- Analytics, advertising, automated buyer routing, payments, OTP, live LINE automation, and commercial solar remain disabled.

The calculator values electricity used within the home first. Conditional surplus purchase and tax information remain outside the base estimate. See the bilingual Methodology and Resources pages and `docs/CALCULATOR_METHOD.md`.

## Local development

Requirements: Node 22.13+ and pnpm.

```bash
pnpm install
pnpm db:migrate:local
pnpm dev
```

Open `http://localhost:3000`.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

The E2E suite expects the local server at `http://localhost:3000` unless `PLAYWRIGHT_BASE_URL` is set.

## Production resources

- Repository: `gvrshabd/solarmatch-thailand`
- Branch: `main`
- Worker: `solarmatch-thailand`
- D1: `solarmatch-thailand-admin`, binding `DB`
- Private R2: `solarmatch-thailand-storage`, binding `MEDIA`
- Access: existing application protecting `/admin*` only

Migrations are versioned under `migrations/`. Never create duplicate D1, R2, Access, or Worker resources. This project must never modify Milly’s repository, Worker, bindings, storage, or Access settings.

See [ARCHITECTURE.md](./ARCHITECTURE.md), [docs/SECURITY.md](./docs/SECURITY.md), [docs/OPERATIONS.md](./docs/OPERATIONS.md), and [docs/ASSET_PROVENANCE.md](./docs/ASSET_PROVENANCE.md).
