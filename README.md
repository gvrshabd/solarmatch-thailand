# SolarMatch Thailand

Thai-first public prototype for helping residential homeowners understand rooftop-solar needs before speaking with an installer. The English routes mirror the Thai experience at `/en`.

## Status

This repository is intentionally in **prototype mode**:

- The estimator is functional and keeps a draft in the visitor's browser. Every result remains labelled as an estimate rather than an engineering design, quotation, or savings guarantee.
- The base calculation values solar electricity used within the home first. It uses a versioned progressive residential tariff, observed installation-cost ranges, degradation and maintenance assumptions, and an explicitly conservative long-term view.
- Conditional surplus purchases (฿2.20/kWh, 5 kW AC export limit, 10 years, subject to quota and utility approval) are explained but excluded from the base result.
- Royal Decree No. 805 is documented as a personal-income-tax exemption/deduction based on actual qualifying spend, capped at ฿200,000 through 2028. It is not a ฿200,000 refund and is excluded from the estimate.
- Contact values are validated and discarded entirely in the visitor's browser. The disabled `/api/leads` route rejects submissions without reading a request body.
- Analytics, LINE, OTP, databases, payments, ads, buyer routing and installer matching are disabled.
- Pages remain `noindex, follow` while validation is underway. The user-directed `Claude-User` agent may fetch public pages, while Anthropic training/search crawlers and the wildcard crawler group remain disallowed.

Policy, tariff, and market references were last checked on **2026-08-28**. The active August 2026 model references the May 2023 residential tariff and current Ft; the announced September 2026 tariff is documented separately so it is not applied before its effective date. See the bilingual Methodology and Resources pages for direct source links.

## Visual assets

The homepage uses a project-specific AI-generated illustrative scene stored locally as responsive WebP files. It is explicitly labelled as illustrative and must not be presented as a real customer, property, or verified installation. The former Pexels photograph has been removed. See [`docs/ASSET_PROVENANCE.md`](./docs/ASSET_PROVENANCE.md) for the complete visual-asset inventory, generation summary, licences, attribution requirements, and limitations.

## Local development

Requirements: Node 22.13+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

With the local server running:

```bash
pnpm test:e2e
```

## Deployment

The project is configured for one isolated Cloudflare Worker named `solarmatch-thailand`. Cloudflare should use:

- Production branch: `main`
- Build command: `pnpm build`
- Deploy command: `npx wrangler deploy`
- Worker configuration: `wrangler.jsonc`

It creates no D1 database, R2 bucket, route, secret or account-wide setting. It must never reuse or modify Milly's Worker, repository, bindings or deployment configuration.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the fixed/deferred boundary.
