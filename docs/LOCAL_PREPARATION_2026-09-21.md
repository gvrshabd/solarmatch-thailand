# Contact, Terms and About preparation

Branch: `preparation/contact-terms-calculator-review`, based on `cc51be67f1297de4f128e5970318889e29307c81`.

## Changes

- Remove Thai/English About pages, navigation and sitemap entries. Deleted source files remain recoverable through Git.
- Render all sixteen existing Terms clauses as continuous legal prose, preserving their text, anchors, version source and readable styling. Layout does not make a contract legally stronger; qualified Thai counsel must assess enforceability and factual completeness.
- When the published public configuration cannot accept contact requests, do not offer an unusable Yes option. Provide a direct estimate path, clear stale affirmative consent from the assessment used to continue, and make no personal-data submission. Preserve the enabled consent/contact journey and all server-side checks.
- Add bilingual regression coverage for removed routes, continuous Terms and stale-Yes/unavailable-contact behavior.

## Actual activation blocker

The unavailable message is driven by server-side readiness, not just a broken button. Production collection is disabled. The existing operator/legal configuration is incomplete and no eligible contracted recipient is configured. This preparation does not enable collection or bypass those controls.

Before real public collection, the owner must supply and publish the actual operator identity/address/registration, public and privacy contacts, rights-request method, effective legal versions, retention and distribution periods, and eligible contracted recipient information. Validate the existing readiness report, then explicitly activate collection through the approved administration workflow. Do not invent values, automatically accept consent, restore the old whole-site development bypass or change secrets. Historical consent and legal versions must remain intact.

## Deployment authorization and validation

After the initial local-only preparation, the owner explicitly requested pushing the completed work to main. This authorizes the existing GitHub-to-Cloudflare pipeline; it does not authorize enabling incomplete contact collection, changing calculator assumptions, or modifying production data.

Validation: lint and TypeScript passed; 56 unit tests passed; production build passed. The full 109-case browser run exposed two consent-layout fixture failures (one per mobile engine); the fixture now explicitly enables contact collection for that layout test, and both targeted reruns passed. Six existing intentional skips remain. About removal and unavailable-contact behavior have bilingual desktop/mobile regression coverage. No application change was made to satisfy the fixture failures.

## Deployment procedure

Recheck remote main and the diff, rerun checks for any integrated changes, confirm whether contact activation prerequisites have actually been completed, and clearly report any remaining blocker before claiming the site is operational. Use the existing SolarMatch GitHub-to-Cloudflare process. No migration, production data write or Cloudflare configuration change is part of this release. Preserve admin Access, D1 and private R2. No operation may target Milly's. Application rollback point before this release is `cc51be67f1297de4f128e5970318889e29307c81`; use a normal revert of this task commit if necessary, never a database restore for these presentation-only changes.

Calculator findings and a reusable, unscheduled monitoring brief are in `CALCULATOR_REVIEW_2026-09-21.md`.
