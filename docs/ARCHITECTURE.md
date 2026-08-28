# Architecture note

## Fixed and durable now

- One Thai-first, English-parity brand and component shell.
- Lead-generation positioning: useful estimate first, installer-matching request second.
- Homepage and estimator share one reusable province-and-bill state model.
- Eight required, consumer-friendly questions with complete final metrics.
- Versioned tariff inversion, province solar yields, research-bounded self-use sizing, roof constraints, current package prices, payback, and 25-year net value.
- Optional address/map and precision details that recalculate results without being required.
- Browser-session persistence across refresh and language switching.
- Central `siteConfig.mode` boundary and local validation-and-discard lead form.
- SEO-friendly localized routes, server-rendered page content, noindex/follow posture, automated-review files, and analytics-event placeholders.
- Licensed local photography with visible creator credit and documented provenance.

## Intentionally deferred

- Final buyer qualification rules, lead price, exclusivity, replacement rules, routing, and response-time obligations.
- Real form submission, lead storage, database, CRM, LINE, email, OTP, payments, ads, analytics provider, or automation.
- Installer vetting, ranking, quote comparison, or performance claims.
- Engineering design, structural assessment, roof polygon/satellite analysis, tariff-class document parsing, or quote guarantee.
- Final PDPA/legal review and production consent language.

The implementation boundary is deliberate: calculator and content assumptions can change quickly without changing the route shell, design system, lead form, or deployment pipeline. See `CALCULATOR_METHOD.md`, `CALCULATOR_SOURCES.md`, `ADDRESS_MAP_PRIVACY.md`, and `ASSET_PROVENANCE.md`.
