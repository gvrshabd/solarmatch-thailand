# SolarMatch Thailand

Thai-first public prototype for helping residential homeowners understand rooftop-solar needs before speaking with an installer. The English routes mirror the Thai experience at `/en`.

## Status

This repository is intentionally in **prototype mode**:

- The estimator is functional and keeps a draft in the visitor's browser. Every result remains labelled as an estimate rather than an engineering design, quotation, or savings guarantee.
- The base calculation values solar electricity used within the home first. It uses a versioned progressive residential tariff, observed installation-cost ranges, degradation and maintenance assumptions, and an explicitly conservative long-term view.
- Conditional surplus purchases (฿2.20/kWh, 5 kW AC export limit, 10 years, subject to quota and utility approval) are explained but excluded from the base result.
- Royal Decree No. 805 is documented as a personal-income-tax exemption/deduction based on actual qualifying spend, capped at ฿200,000 through 2028. It is not a ฿200,000 refund and is excluded from the estimate.
- Contact submissions are validated by `/api/leads` and immediately discarded. They are not logged, stored, routed or forwarded.
- Analytics, LINE, OTP, databases, payments, ads, buyer routing and installer matching are disabled.
- Search engines are instructed not to index the site while validation is underway.

Policy, tariff, and market references were last checked on **2026-08-28**. The active August 2026 model references the May 2023 residential tariff and current Ft; the announced September 2026 tariff is documented separately so it is not applied before its effective date. See the bilingual Methodology and Resources pages for direct source links.

## Photography

The homepage photograph is stored at `public/images/solar-home-hero.jpg` and comes from [Robert So on Pexels](https://www.pexels.com/photo/a-house-with-solar-panel-on-the-roof-12243093/) under the [Pexels licence](https://www.pexels.com/license/). It is a real residential rooftop-solar photograph used for illustration, but it has **not** been confirmed as a home in Thailand. Replacing it with properly licensed, authentic Thai residential photography remains a documented asset task; the current image must not be presented as a Thai installation or customer project.

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
