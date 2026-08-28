# Architecture and decision boundary

This boundary keeps the public prototype useful while buyer interviews, household research, policy interpretation, and production operations are still being validated. Policy, tariff, and market references were last checked on **2026-08-28**.

## Fixed now

- Next-compatible App Router application built by vinext for one isolated Cloudflare Worker named `solarmatch-thailand`.
- Thai-first bilingual responsive shell with `/en` route parity, localized navigation, footer, estimator, results, legal drafts, and reusable content-page patterns.
- Durable internal navigation implemented with semantic anchors so routes work under the deployed Workers runtime as well as local development.
- Focused estimator experience with minimal chrome, one progress treatment, accessible controls, and browser-session draft recovery across refreshes and language changes.
- Exact-address entry with an explicit privacy boundary, a user-confirmed Leaflet/OpenStreetMap position, province fallback, and no geocoder or server-side address handling.
- Routes for the homepage, estimator, results, education, methodology, project information, contact placeholder, source register, and draft legal notices.
- Config-driven estimator questions and a replaceable `Estimator` interface.
- Versioned prototype calculations isolated under `lib/calculator/`, with progressive residential-bill logic kept separate from interface components.
- Base-case value calculated from solar electricity used within the home before considering surplus electricity.
- Date-selected residential tariffs: the schedule effective through August 2026 and the published September–December 2026 schedule, each with versioned Ft, service charge, VAT, and tests.
- One public planning value for system size, production, price, savings, and supported payback. An “up to” ceiling appears only behind evidence gates, uses the same system and exclusions, and is capped at 20% above planning.
- Transparent cash-price anchors based on observed 1.5, 3, 5, and 10 kWp packages, plus explicit production degradation, routine upkeep, a year-13 inverter reserve, and 0% tariff escalation.
- Direct-use savings calculated as the difference between progressive monthly residential bills, not one flat baht-per-kWh multiplier.
- Evidence confidence based on input quality, with unsupported TOU/private financial outputs and low-confidence payback withheld.
- Conditional policy information kept beside—but outside—the base result: surplus purchases at ฿2.20/kWh, a 5 kW AC export limit, a 10-year term, and quota/utility approval requirements.
- Royal Decree No. 805 documented as a personal-income-tax exemption/deduction based on actual qualifying expenditure, capped at ฿200,000 through 2028. It is not described as a refund and is excluded from calculations.
- Direct primary-source links and a visible last-checked date on the Thai and English Methodology and Resources pages.
- Typed, provider-free analytics events with analytics disabled by default.
- LINE and contact details centralized in `config/site.ts` and left blank.
- Contact-flow validation runs only in the browser and discards values without a network request. The legacy `/api/leads` route fails closed with `410 Gone` and does not read request bodies.
- Staging discovery posture: complete metadata/sitemap plus `noindex, follow`; `Claude-User` is explicitly allowed for user-directed retrieval, while `ClaudeBot`, `Claude-SearchBot`, and the wildcard crawler group remain disallowed.
- A plain-text `/llms.txt` describes canonical routes and prototype limitations without acting as an access-control mechanism.
- A real residential-solar photograph licensed for free use is served locally in responsive formats and presented as illustrative. Complete asset provenance is recorded in `docs/ASSET_PROVENANCE.md`.
- The About page states what the prototype does today, what is inactive, the evidence model, and the deliberate initial Bangkok Metropolitan Region validation boundary.
- One Worker with no database, storage binding, payment integration, or shared resource with Milly's.

## Calculator and map documentation

- `docs/CALCULATOR_METHOD.md` records formulas, constants, rounding, gates, and exclusions.
- `docs/CALCULATOR_SOURCES.md` separates primary evidence from transitional assumptions.
- `docs/ADDRESS_MAP_PRIVACY.md` records the exact browser/provider data flow and the reason public geocoding is not used.
- `docs/UX_RESEARCH.md` records the question-flow, confidence, accessibility, and ethical-persuasion decisions.

## Intentionally deferred

- A site-specific engineering design, structural assessment, shading study, equipment selection, or production guarantee.
- Exact-address geocoding, autocomplete, satellite roof imagery, automated roof polygons, LiDAR, or a provider contract. The current marker is user-confirmed manually.
- Final qualification rules, installer qualification, buyer-specific lead criteria, geographic coverage, and niche-specific claims that depend on interviews.
- Lead pricing, exclusivity, replacement policy, response-time rules, and routing.
- Real lead storage, notifications, CRM, OTP, fraud controls, payment, or automation.
- Live LINE Official Account, phone number, email, advertising, or analytics providers.
- Household-specific eligibility for surplus purchases, quota availability, utility approval, export-control design, and automated surplus-income calculation.
- Household-specific tax eligibility or tax-benefit calculation. The ฿200,000 figure is a qualifying-spend cap, not a promised tax saving.
- Financing assumptions and tariff escalation beyond the clearly labelled base case.
- Installer profiles, reviews, testimonials, quote comparison, savings guarantees, and marketplace claims. Future social proof must remain behind a feature flag until it can be substantiated.
- Automated monitoring of tariffs, Ft, programme quotas, law changes, and third-party package prices. All require re-verification before production use.
- Final legal identity, PDPA review, production privacy/terms language, recipients, retention periods, and data-subject procedures.
- Real SolarMatch customer photography or a documented Thai installation. The current licensed photograph is illustrative and is not evidence of a SolarMatch customer, a Thai property, or an engineering outcome.

## Visual-asset provenance

- Canonical inventory: `docs/ASSET_PROVENANCE.md`.
- The homepage photograph is by Kindel Media and is used under the Pexels licence documented in the canonical inventory.
- Responsive WebP derivatives and the social-preview crop are served locally; no runtime image is hotlinked.
- The previous project-generated AI hero files and the earlier Robert So Pexels asset are removed and no longer referenced.

## Swap points

- Edit questions in `config/estimate-flow.ts`.
- Edit policy, production, maintenance, price, and other assumptions in `config/solar-assumptions.ts`.
- Version tariff schedules in `config/electricity-tariffs.ts`; change the active schedule only when its effective date and model tests agree.
- Replace the estimator behind `lib/calculator/index.ts` after engineering and market validation.
- Keep conditional surplus-purchase and tax modules disabled until household inputs, eligibility checks, and current policy are verified.
- Enable integrations only through `config/feature-flags.ts` after their production configuration is complete.
- Activate or replace `/api/leads` only after the data controller, recipients, retention period, consent text, security controls, and explicit production approval are complete.
- Replace the licensed illustrative photograph only with a project-created asset or another source whose provenance and licence are documented before deployment.
