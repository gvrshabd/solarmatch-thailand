# SolarMatch Thailand

Thai-first public prototype for helping residential homeowners understand rooftop-solar needs before speaking with an installer.

## Status

This repository is intentionally in **prototype mode**:

- The estimator is functional, but its assumptions are preliminary and every result is labelled accordingly.
- Contact submissions are validated by `/api/leads` and immediately discarded. They are not logged, stored, routed or forwarded.
- Analytics, LINE, OTP, databases, payments, ads, buyer routing and installer matching are disabled.
- Search engines are instructed not to index the site while validation is underway.

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
