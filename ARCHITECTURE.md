# Architecture and decision boundary

## Fixed now

- Next-compatible App Router application built by vinext for Cloudflare Workers.
- Thai-first responsive shell, design tokens, navigation, footer and content-page patterns.
- Routes for the homepage, estimator, results, education, methodology, project information, contact placeholder and draft legal notices.
- Config-driven estimator questions and a replaceable `Estimator` interface.
- Prototype calculations isolated in `lib/calculator/prototype-estimator.ts`.
- Typed, provider-free analytics events with analytics disabled by default.
- LINE and contact details centralized in `config/site.ts` and left blank.
- Non-persistent lead endpoint with server-side schema validation and no PII logging.
- Staging SEO posture: complete metadata/sitemap plus `noindex` and a disallowing robots file.
- One Worker, no database or storage bindings.

## Intentionally deferred

- Validated engineering assumptions and production calculator implementation.
- Installer qualification, buyer-specific lead criteria and geographic coverage.
- Pricing, exclusivity, replacement policy, response-time rules and lead routing.
- Real lead storage, notifications, CRM, OTP, fraud controls or automation.
- Live LINE Official Account, phone number, email and consent recipients.
- Policy-dependent export-income, tax-benefit, financing and payback calculations.
- Installer profiles, reviews, quote comparison and marketplace claims.
- Analytics/advertising providers, cookie consent tooling and public acquisition.
- Final legal identity, PDPA review and production privacy/terms language.

## Swap points

- Edit questions in `config/estimate-flow.ts`.
- Edit assumptions in `config/solar-assumptions.ts`.
- Replace the estimator behind `lib/calculator/index.ts` after validation.
- Enable integrations only through `config/feature-flags.ts` after their production configuration is complete.
- Replace `/api/leads` only after the data controller, recipients, retention period and security controls are approved.
