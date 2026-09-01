# SolarMatch operations, backup, recovery, and release procedure

Last reviewed: **2026-09-01**

## Bound production resources

- Worker: `solarmatch-thailand`
- Production branch: `main`
- D1 database: `solarmatch-thailand-admin` (`DB`)
- Private R2 bucket: `solarmatch-thailand-storage` (`MEDIA`)
- Cloudflare Access: durable `/admin*` application plus the owner's temporary Worker-wide development gate
- Initial application allowlist: `deluxejahseh@gmail.com`

Never create replacement resources merely because a binding is unavailable in one local shell. Confirm the existing account resource and Worker binding first. Never broaden Access to public routes and never modify Milly's.

## Initial migration

1. Record the Git commit and current Worker deployment.
2. Export D1 with `wrangler d1 export solarmatch-thailand-admin --remote --output <dated-file>` and record a D1 Time Travel bookmark. If account authentication does not permit direct export, do not bypass it: record the bookmark and exact limitation before continuing.
3. Confirm the private R2 bucket and bindings.
4. Apply migrations locally, run the complete test suite, and inspect the schema.
5. Run `wrangler d1 migrations list solarmatch-thailand-admin --remote`.
6. Apply only pending versioned migrations with `wrangler d1 migrations apply solarmatch-thailand-admin --remote`.
7. Deploy the matching Git commit through the existing GitHub → Cloudflare pipeline.
8. Request `/api/assessment/config` once to seed the immutable legal-launch release, then verify migration `0003_shared_lead_legal_launch.sql`, questionnaire/rules v2, five fact rows, disabled contact configuration, and current release references.

The seed release has `live_lead_submissions = 0` and an incomplete legal record. Applying the migration or deploying code cannot silently activate lead collection.

## Secrets

Configure these only as encrypted Worker secrets:

- `ADMIN_EMAILS`
- `CSRF_SECRET`
- `ASSESSMENT_SIGNING_SECRET`

The non-secret Access team URL and AUD remain in `wrangler.jsonc`. `.dev.vars.example` documents local names but contains no usable values. Rotate signing or CSRF secrets through Cloudflare, then verify the admin and public submission gates. Rotating the assessment secret invalidates outstanding short-lived assessment tokens and does not affect stored leads.

## Routine backup

- Export D1 before every schema migration and before any bulk administrative repair.
- Keep dated encrypted exports outside the public repository and record the matching migration and Git revision.
- Use D1 Time Travel for short-window recovery according to the Cloudflare account's available retention.
- R2 objects are not the structured lead database. Keep an inventory/export of published media metadata and retain original licensed source provenance separately.
- Questionnaire, rule, contact-mode, and loading-fact rollback normally uses the admin “Restore as draft” action followed by preview and explicit publish. This creates a new version and preserves history.

## Recovery

- Application regression: revert only the task's Git commit, push normally, monitor the GitHub → Cloudflare deployment, and smoke-test public and admin boundaries.
- D1 migration regression: stop writes, use the pre-migration export or Time Travel bookmark in accordance with Cloudflare's documented restore procedure, then verify row counts and foreign keys before reopening writes.
- Configuration regression: restore the prior questionnaire, rule, contact, or loading-fact version as a new draft, preview, publish, and confirm the new release ID.
- R2 media regression: archive the media metadata or restore an approved original under a new generated object key. Do not make the bucket public.
- Permanent lead purge cannot be undone and must not be represented as recoverable.

## Activation checklist

Live contact collection must remain disabled until the intended mode is explicit and the user supplies and approves the mode-specific requirements.

For SolarMatch-only validation follow-up:

- legal operator name in Thai and English;
- legal/operator address;
- public privacy-rights email or other contact channel;
- retention period in days; and
- consent wording limited to SolarMatch validation follow-up.

For shared residential-solar-company handoff, also require published adult/consent/Privacy/Terms/Cookie versions, a positive distribution window, recipient category and allowed fields, and at least one active partner with legal identity, privacy URL, matching service area, and a currently valid recorded contract.

Then complete and review the Thai and English Privacy Notice and Terms, preview and publish the configuration, run successful/failed/duplicate/withdrawal/deletion and consent-scoped export tests, inspect logs for PII, and only then enable the release. Do not activate ads in the same change.

## Post-deployment smoke test

Verify Thai and English home, assessment, results, methodology, privacy, terms, cookies, robots, and llms routes through the temporary owner gate. Verify `/admin/` continues to use the more-specific admin application, accepts only the allowlisted Access identity, and rejects forged identity. Confirm the public config reports contact collection disabled until the activation checklist is complete. Recheck the independent Milly's URL with a read-only request; do not mutate its repository, Worker, bindings, storage, or Access settings.

## Removing the temporary whole-site gate

In Cloudflare, open Workers & Pages → `solarmatch-thailand` → Access and remove or disable only the Worker-wide temporary development policy. Do not delete or edit the hostname policy whose target is `/admin*`, do not change `ACCESS_AUD` in `wrangler.jsonc`, and do not change account-wide Access protection. Then verify anonymous `/` and `/en` return the public site, anonymous `/admin/` is still challenged, an approved admin can sign in, and Milly's remains reachable.
