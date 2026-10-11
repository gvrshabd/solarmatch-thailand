# Isolated installer workflow: local testing and recovery

Run only against the dedicated local configuration; its database ID is deliberately fictitious. Do not pass `--remote` or deploy this configuration.

## Current focused reliability pass after 055dcf0

The earlier IPv4-only workaround did not resolve the combined timeout. The current fix consumes small rejected request bodies with a strict size/deadline limit before returning the existing 401/403/415. Full sequence coverage is retained, including rejected POST followed by document navigation and a credential-free reduced reproduction. Nothing is fixed by increasing browser timeouts or replacing the sequence with isolated cases. Run the complete sequence against a disposable restored demo:

```powershell
$env:INSTALLER_E2E = '1'
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:3000'
pnpm exec playwright test tests/e2e/installer-admin-local.spec.ts tests/e2e/installer-request-lifecycle.spec.ts --project=desktop-chromium --project=mobile-chromium --repeat-each=2
```

For safe request timings only, optionally set `ADMIN_DIAGNOSTICS=1`. The authenticated cases disable traces/screenshots/video and export only allowlisted paths (no query), methods, statuses, pending requests and error counts. Never export raw browser storage, headers, bodies, console text, OTPs or tokens. See `installer-admin-timeout-evidence.txt` and `installer-reliability-test-results.txt` for actual failures, diagnosis, verification and limitations. The sections below record earlier historical runs.

The current export helper defaults to `installer-demo` and verifies exact `0001`–`0018` filenames; the restore-check helper requires an explicit fresh destination. Current private rehearsal: `installer-review-final` exported to `restore-final`, all sixty tables and twenty-five triggers matched. Original demo is untouched. Object rehearsal `objectsreviewfinal` contains one invented object in separate local buckets, not a real contract or real Cloudflare recovery.

Subsequent autonomous preparation extends the chain through `0018` (campaign attribution and operations). Use all eighteen migrations for the new code. The earlier sixteen-migration results below are historical. Admin **Installer operations** now includes campaign reports/spend, local alerts/preflight and read-only shutdown liability review. Use `http://127.0.0.1:3000/admin/local-access` with the existing ignored test password; installer portal is `/installers`, homeowner assessment `/estimate` or `/en/estimate`. Never expose the loopback admin bypass remotely. Keep both campaign flags false, outbound false, all business effects disabled/paused and test clock cleared after exercises.

Current eighteen-migration restore: `.wrangler/installer-prep-final-2026-10-11/synthetic-final.sql`, SHA-256 `4b25519158ad67ad5684ed518813d1384795f90c74007394be8e6d82652713bd`, restored to `.wrangler/restore18prep`. Sixty tables, twenty-five triggers and every row matched at the snapshot; foreign-key, ledger, recipient-cap and portal-consent checks passed. Five leads/enquiries, six deliveries, thirteen ledger entries, two claims and three legal versions were preserved. Subsequent sign-ins add synthetic session/audit rows normally. The SQL, sessions and recovery stores remain private and excluded from review archives. Local object rehearsal `objects18prep` verified an invented object's bytes and content/custom metadata in a separate empty local bucket; this is not real Cloudflare recovery. Run `node scripts/installer-local-safety-check.mjs installer-demo` for a read-only held-state/count check. Review current test history in `installer-autonomous-test-results.txt`.

Synthetic backup/restore and isolated object rehearsal commands are in `installer-recovery-incident-runbook.txt`; claims/shutdown review and provider/domain blockers have focused `.txt` documents. The completed review package records exact final tests, commit and hashes. It does not include private SQL, signing keys, captured OTP/email/LINE invitations or staff tokens.

The current targeted repair uses the full sixteen-migration chain (`0001`–`0016`) and synthetic fixtures only. Final unit tests passed 256/256 across 39 files, typecheck/lint and both builds passed. Broad browsers: 156 passed, 16 intentional skips, one Safari navigation timeout; the unchanged timed-out case passed alone, then the complete 20-case mobile WebKit audit passed sequentially. Separate installer/admin acceptance passed six/four cases. The connected demonstration and final 55-table/23-trigger recovery comparison passed. Prior results and the thirteen-migration snapshot below are historical. Keep collection, purchases, outbound messaging and automatic allocation disabled after each exercise. No local/mock result is real-provider or production acceptance.

```powershell
node scripts/installer-local-setup.mjs
pnpm exec wrangler d1 migrations apply solarmatch-installer-local-test --config .installer-test/wrangler.jsonc --local --persist-to .wrangler/installer-test-state
$env:INSTALLER_LOCAL_TEST = 'true'
pnpm dev --port 3000 --host localhost
```

Open `http://localhost:3000/installers`. Registration sends a verification preview into the isolated `installer_test_messages` table. Inspect that local table with Wrangler and open the verification URL; never export these private recovery links or treat test previews as real delivery. The configuration disables outbound messages and payments, and settings initially disable collection and delivery. Synthetic fixtures and settings must be configured before running the complete test workflow.

The Worker delegates HTTP handling to vinext and exports a scheduled handler. `runInstallerJobs` accepts local-test, sandbox or deliberate production mode only after validating its origin and setting gates. No cron trigger is configured. The inactive [deployment example](installer-deployment.example.jsonc) uses fictitious bindings, provider modes off and an empty cron list; production `wrangler.jsonc` remains unchanged. During an isolated Wrangler test, use the documented `/__scheduled` local trigger with `wrangler dev --test-scheduled` against a built Worker, or invoke the job through the authenticated admin operation. Never expose an unauthenticated public job endpoint.

The main Vite configuration selects this isolated binding configuration only when `INSTALLER_LOCAL_TEST=true`. Without that opt-in the existing binding configuration is used and installer mode defaults to off. Keep `.installer-test/.dev.vars` ignored; the setup script creates it exclusively and never overwrites existing secrets. It does not read or reuse the repository root `.dev.vars`.

## Repeatable synthetic workflow

For the populated company, four verified fictional homeowner requests, purchased and trial deliveries, claims, staff links, and local notification captures, follow [installer-demo-local.md](installer-demo-local.md) after building and migrating the isolated preview. The script uses the protected loopback admin session and normal application services, including actual local authentication and OTP proof with captured email/SMS transport. It restores paused settings afterward. Use Node.js 22 or newer; this computer's default `node` may be older than the project requirement.

Keep the server running in one terminal. In a second terminal at the same repository, run:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://localhost:3000'
$env:INSTALLER_E2E = '1'
pnpm exec playwright test tests/e2e/installer-workflow.spec.ts --project=desktop-chromium --project=mobile-chromium
Remove-Item Env:INSTALLER_E2E
pnpm exec wrangler d1 execute solarmatch-installer-local-test --local --config .installer-test/wrangler.jsonc --persist-to .wrangler/installer-test-state --command "UPDATE installer_platform_settings SET config_json=json_set(config_json, '$.platformPaused', json('true'), '$.collectionEnabled', json('false'), '$.paymentsEnabled', json('false'), '$.deliveryPaused', json('true'), '$.notificationsEnabled', json('false')) WHERE id=1"
pnpm test:e2e
pnpm test
pnpm lint
pnpm typecheck
```

The explicit installer suite calls the loopback-only `/api/installer/test` fixture endpoint, which adds clearly labelled synthetic companies, a synthetic payment order and test credits to this isolated database. It enables collection only for requests to that local test server. It does not publish contact settings, create an administrator bypass or associate the synthetic companies with a real account. Repeated seeding does not reissue fixture credits. The local-only SQL command restores disabled collection and paused delivery before the ordinary regression suite, which verifies those defaults. Email recovery URLs and SMS codes are consumed privately by the tests, not written to the terminal. Browser traces can contain synthetic personal details; keep the ignored `test-results` and `playwright-report` directories private. Authentication and OTP limits are intentionally enforced in tests: rapid repeated suite runs can exhaust a shared loopback bucket; wait for its window instead of weakening limits.

The suite exercises real email/password registration, verification, persistent sessions, company creation, logout/recovery, bilingual 320px layouts and accessibility, No-to-results with no referral, SMS challenge/proof, contact submission and repeat-safe synthetic payment completion. SQLite service tests exercise approvals/terms, trial and paid allocation, recipient caps, ledgers, claims, notifications, suppression and staff links. They are not proof of external provider acceptance.

For the repaired compiled portal and payment-return flows, run the following after rebuilding and starting the isolated preview:

```powershell
pnpm exec playwright test tests/e2e/installer-repair-portal.spec.ts tests/e2e/installer-payment-return.spec.ts --project=desktop-chromium --project=mobile-chromium
```

These browser cases intercept API responses with synthetic data; they exercise Thai/English rendering, original withdrawn claim deadlines/submission, expiry, debt notices, selected checkout methods, pending/confirmed/repeated authorisation returns, LINE disconnect/reconnect controls, narrow layout and scoped accessibility. Server tenant/authentication, final-pause/consent boundaries and ledger checks are verified by unit/service/route fixtures, not inferred from intercepted browser responses. Route regressions also reject outcome writes for withdrawn or unavailable deliveries without misleading success audits. Run `pnpm test`, `pnpm typecheck`, `pnpm lint` and both normal/isolated builds for aggregate verification, then record the actual results in the implementation report.

Run `pnpm build` without `INSTALLER_LOCAL_TEST` for the normal production build profile. Building does not deploy. Do not run `pnpm deploy`, `git push`, remote migration commands or the isolated configuration with `--remote` during this task.

For the broad browser suite, prefer a compiled local preview over the development server. Stop the development server, then use the following commands. The generated Worker must retain the fictitious local database ID; the check prevents accidentally selecting a production build profile.

```powershell
$env:INSTALLER_LOCAL_TEST = 'true'
pnpm build
$previewConfig = Get-Content -Raw dist/server/wrangler.json | ConvertFrom-Json
if ($previewConfig.name -ne 'solarmatch-installer-local-test' -or $previewConfig.d1_databases[0].database_id -ne '00000000-0000-0000-0000-000000000006') { throw 'Refusing non-isolated preview configuration' }
pnpm exec wrangler dev --config .installer-test/preview.jsonc --local --port 3000 --ip localhost --persist-to .wrangler/installer-test-state --log-level error
```

Keep the preview running while the second terminal runs Playwright. Stop it before rebuilding `dist`; no source hot reload is needed for these checks. The dedicated preview configuration sits beside the ignored `.installer-test/.dev.vars`, so Wrangler loads the isolated signing keys correctly. Starting directly from the generated `dist/server/wrangler.json` does not reliably load those keys and may correctly fail authentication/OTP closed. The explicit `--local`, fictitious binding identifiers, private test signing keys and disabled outbound flag preserve isolation. The general suite should run with `INSTALLER_E2E` unset and local collection disabled; the six explicit installer cases are run separately with the opt-in variable.

For a genuinely fresh synthetic run, choose a new directory under `.wrangler` and use that same `--persist-to` directory for migrations, the preview and any local SQL commands. An earlier isolated installer verification used `.wrangler/installer-final-state`. This leaves earlier local fixtures intact and avoids weakening or clearing application abuse limits.

### Repair verification: Windows loopback and separate fixture stores

The repair run encountered order-dependent navigation timeouts using `localhost` in the existing combined admin browser suite. Changing readiness waits or cancelling rejected request bodies did not resolve them; those speculative application/test changes were removed. The four unchanged admin checks subsequently passed with the explicit IPv4 origin/config below. This is an observed local workaround, not a claim about production network behavior or a proven root cause. It preserves origin checks, authentication, CSRF assertions, timeouts and all test coverage.

```powershell
pnpm exec wrangler dev --config .installer-test/preview-ipv4.jsonc --local --port 3000 --ip 127.0.0.1 --persist-to .wrangler/installer-demo --log-level error
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:3000'
$env:INSTALLER_DEMO_ORIGIN = 'http://127.0.0.1:3000'
```

Use the same fictitious database configuration for local migrations and SQL commands. Wait for the complete migration command to succeed before starting the server. The normal compiled local-test profile is reused; the IPv4 preview overrides only its loopback runtime origin. Never use either preview configuration with `--remote` or deploy it.

The existing hourly SMS-send limit is five per network address. The two browser acceptance submissions plus the five-request connected demonstration cannot run in the same fresh hourly bucket. This run kept the limit unchanged: browser acceptance used `.wrangler/installer-run`, while the connected demonstration and broad public regressions used `.wrangler/installer-demo`. The earlier `.wrangler/installer-final-state` remains preserved, with all eight original synthetic leads and existing financial/legal records retained. Each store was returned to disabled collection/payments/notifications, paused allocation/global platform and a cleared test clock. Use separate fresh stores or wait for the real rate window; do not clear counters, weaken limits or spoof trusted network headers.

Keep persistence names short on Windows. A longer fresh directory produced `SQLITE_CANTOPEN`; the short names above worked without deleting old state. Preserve private demo-state/share-link files before switching populated stores, since the demonstration reuses those local reference files. The setup accepts only an explicitly configured loopback HTTP `INSTALLER_DEMO_ORIGIN`; the default remains `http://localhost:3000`.

## Queue and notification operation

A verified submission atomically creates its canonical queue record. It does not wait for allocation or messaging before showing results. In local service tests the same queue/outbox services run directly. In a future separately approved deployment, schedule `runInstallerJobs` once per minute; it processes at most 50 enquiries and 30 notifications per invocation. No schedule was activated here. Outside configured Bangkok hours both allocation and referral notification dispatch wait: 09:00 inclusive through 17:00 exclusive every day. Outbox checks the hours before its batch, each lease and each provider call; closing during a batch returns unsent leased work without consuming attempts. User-requested login, verification and recovery are outside this referral-hours gate. Pending requests with no eligible company become visibly unmatched, without relaxing their eligibility or expiry.

Admin provides queue processing and retry controls behind the existing Access identity and CSRF checks; local tests do not weaken those checks. Failed/ambiguous notifications appear in the outbox. An ambiguous SMS acceptance needs reconciliation, not blind resending. Withdrawal tasks need recorded recipient notification. The current alert surface is the admin attention-required count; no external alert channel was activated.

Allocation and notification dispatch require matching trusted lead classification, current platform mode and delivery allocation environment. Production must never send a historic/local/sandbox test queue. Context mismatch remains visibly action-required with `notification_environment_mismatch` and no lost attempt; an operator must resolve the context before a safe retry. Historical NULL delivery context is accepted only for local historical preview tests. Both provider branches re-read the active lease, current recipient and withdrawal/purge state immediately before dispatch. Test canonical identities are separated from production even when the same synthetic phone/property is reused.

Owner LINE unlink invalidates pending links/invitations and advances the company generation, so a token request already awaiting a provider cannot create a challenge that silently reconnects afterward. Unsent notifications remain for operator review; disconnected LINE retries are refused. A later fresh invitation permits a legitimate connection. Do not interpret blocking the Official Account as the portal unlink action, or promise that an already dispatched message can be recalled.

The protected, loopback-only test clock drives allocation and outbox due/lease times in the isolated demonstration, so a queued delivery made at a pinned 10:00 Bangkok can be captured immediately in that same scenario. Authentication, phone-code expiry, and real provider delivery are not simulated by this clock. A withdrawal cancels pending notifications and access, but cannot retract a provider call already in flight; if that call is accepted after cancellation, the outbox remains cancelled and records the provider reference for operator review. Never interpret cancellation alone as proof that no message reached a recipient.

## Configuration without secret values

| Setting | Purpose and safe default |
| --- | --- |
| `INSTALLER_PLATFORM_MODE` | `off` by default; explicit `local-test`, `sandbox`, or `production`. Production requires a reviewed HTTPS non-loopback origin. No key selects it automatically. |
| `INSTALLER_BASE_URL` | Exact origin used by current request validation. Local tests require loopback; sandbox and production require HTTPS. A separate installer subdomain requires an explicit origin/authentication design and tests for homeowner origins, cookies, CORS/CSRF and auth/payment/LINE callbacks; routing or DNS alone is insufficient. |
| `INSTALLER_AUTH_SECRET` | Random signing secret, at least 32 characters, supplied through private environment configuration. |
| `PHONE_VERIFICATION_SECRET` | Separate random secret for OTP and canonical-enquiry HMAC domains. Rotation requires a duplicate-identity continuity plan. |
| `ASSESSMENT_SIGNING_SECRET` | Existing assessment-token signing; isolated setup generates its own, never copies production. |
| `OUTBOUND_MESSAGES_ENABLED` | `false`; enabling it is separate from persisted notification settings and every provider's own live gate. |
| `AUTH_EMAIL_PROVIDER_MODE`, `AUTH_EMAIL_LIVE_ENABLED`, `AUTH_EMAIL_FROM`, `AUTH_EMAIL_PROVIDER_TOKEN` | Off/false by default. Explicit Resend sandbox or live transport requires verified sender/domain and credentials. Local mode captures email instead. |
| `OMISE_PROVIDER_MODE`, `OMISE_LIVE_ENABLED`, `OMISE_PUBLIC_KEY`, `OMISE_SECRET_KEY`, `OMISE_WEBHOOK_SECRET` | Off/false by default. Sandbox/test and production/live modes require matching keys. Purchases also require enabled business settings and actual activated methods/brands; read-only reconciliation can continue after purchases are switched off. |
| `SMS_PROVIDER_MODE`, `SMS_LIVE_ENABLED`, `SMS_ACCOUNT_SID`, `SMS_AUTH_TOKEN`, `SMS_CREDENTIALS_ARE_TEST`, `SMS_FROM`/`SMS_MESSAGING_SERVICE_SID` | Off/false by default. Twilio sandbox uses test credentials and magic sender; production requires explicit live mode, non-test credentials and approved sender or service. Local mode captures messages. Thai deliverability remains untested. |
| `LINE_PROVIDER_MODE`, `LINE_LIVE_ENABLED`, `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_TEST_RECIPIENTS` | Off/false by default. Sandbox requires a JSON test-recipient allowlist; live enquiry pushes require a linked recipient. Leave outbound off until separately authorized. |
| `LOCAL_ADMIN_PASSWORD`, `LOCAL_ADMIN_SESSION_SECRET` | Generated only in ignored isolated `.installer-test/.dev.vars`; protected loopback `/admin/local-access` is unavailable elsewhere. |

Preserve existing `DB`, `MEDIA`, admin Access AUD/team, `ADMIN_EMAILS` and `CSRF_SECRET`. No production secret changes were made. Settings separately gate global pause, collection, purchases, allocation and notifications; all active effects default disabled/paused. Production mode code exists but requires deliberate provider/account activation and acceptance, not merely a flag flip. See [provider setup](INSTALLER_PROVIDER_SETUP.md) and [remaining work](INSTALLER_REMAINING_WORK.md).

## Migration, backup and recovery

The thirteen additive installer migrations run from `0006` through `0018`; apply the complete eighteen-migration ordered chain to this local database. `0011` adds operation/run tracking and database allocation guards; `0012` contains the isolated test clock; `0013` adds Omise reconciliation timestamps and error codes. `0014` guards debt-first incoming credits; `0015` adds trusted submission classification, test canonical namespaces and final collection/allocation guards; `0016` adds monotonic company LINE-link generation; `0017` adds campaign capture/spend; `0018` adds scheduler leases and local alerts. These migrations are local only. Historical leads stay unverified, historic delivery facts and test labels remain, and no old consent is rewritten. Verification evidence is stored separately from expiring OTP secrets. Never edit a migration after it has been applied to an authoritative environment.

Before any future production migration, obtain separate approval, export only the SolarMatch D1 database to the established protected backup location, record its Time Travel bookmark and table counts, and inventory SolarMatch private objects. Test restoration and the ordered migrations on a disposable copy. Do not commit backups, read unrelated buckets, or substitute this fake local database ID for production bindings.

Application rollback and database rollback are different. Leave additive tables intact when rolling application code back; reversing a Git commit does not reverse D1. Use a reviewed backup/Time Travel recovery only for an actual data/schema problem. Purging homeowner data is irreversible in normal application operation; never promise a deleted record can be restored. Keep backup retention and deletion requirements in the final privacy policy.

### Historical synthetic recovery exercise before this repair (11 October 2026)

The preview was stopped while taking the snapshot. `scripts/installer-local-export.mjs` uses Wrangler's installed Miniflare exporter against the exact fictitious database ID and `.wrangler/installer-final-state/v3/d1`; Wrangler 4.92 `d1 export --local` does not support `--persist-to`, so using its default path would export the wrong local store. No remote API is used.

Private ignored exports:

- `.wrangler/installer-recovery-2026-10-11/synthetic-final.sql` (raw snapshot; SHA-256 `1c583eee342dc431e46583df52a5872590e2be5e6c3461777c52e8c863cf9a5f`).
- `.wrangler/installer-recovery-2026-10-11/synthetic-restore-ordered.sql` (all tables/indexes first, data second, safety triggers last).
- Disposable restored store: `.wrangler/restore12`.

The ordinary raw import failed because referenced tables may appear later in D1's export. The ordered restore also prevents ledger/delivery triggers from replaying charges against already-restored balances. Use a fresh empty destination; do not import over a populated database. Short local folder names avoid the Windows SQLite path-length limit.

Commands exercised with the bundled Node/pnpm runtime:

```powershell
node scripts/installer-local-export.mjs
pnpm exec wrangler d1 execute solarmatch-installer-local-test --local --config .installer-test/preview.jsonc --persist-to .wrangler/restore12 --file .wrangler/installer-recovery-2026-10-11/synthetic-restore-ordered.sql --json
node scripts/installer-local-restore-check.mjs
```

All 55 application tables and 19 triggers matched at the snapshot: eight leads/enquiries, six deliveries, fourteen ledger entries, two claims and thirteen migrations. Foreign-key and ledger-conservation checks passed. Private SQL files include local sessions/verification captures and must not be packaged or committed. Scripts preserve existing exports and reject a changed snapshot instead of overwriting it; choose a separately reviewed fresh private location for another rehearsal. Later demo reruns legitimately add audits and rotate links, so comparison against the earlier snapshot is only expected to pass before further interactions. R2 recovery, production Time Travel and real data restoration were not exercised.

That historical snapshot does not verify the new sixteen-migration schema. The current local rehearsal is recorded below; a future approved production backup/restore exercise must include the repaired schema and cannot substitute local synthetic evidence for production acceptance. Provider credentials/settlement, controlled Thai SMS and LINE OA tests, production scheduling/alerts, backups, company facts, tax, retention and credit/refund policies remain launch tasks. Campaign attribution also remains absent: `lib/analytics/track.ts` is a no-op, not an implemented analytics/attribution pipeline.

### Final repaired-schema recovery exercise (11 October 2026)

With the compiled preview stopped, the final connected demonstration store was exported and imported into a new empty local destination. Only fictitious local bindings were used:

```powershell
node scripts/installer-local-export.mjs installer-repair-final-2026-10-11 installer-demo
pnpm exec wrangler d1 execute solarmatch-installer-local-test --local --config .installer-test/preview-ipv4.jsonc --persist-to .wrangler/restore16repair --file .wrangler/installer-repair-final-2026-10-11/synthetic-restore-ordered.sql --json
node scripts/installer-local-restore-check.mjs restore16repair installer-demo
```

The raw private SQL hash is `bd3748eeb888faf73d514d034de56c485a182ced17048c9054bfa32af3f5eb7e`. The comparison uses bundled Node's read-only SQLite API, avoiding additional Workerd RPC servers. All 55 application tables and exact row values matched, as did 23 safety trigger definitions. Foreign-key violations and ledger mismatches were zero. Counts: five synthetic leads/enquiries, six deliveries, thirteen ledger entries, two claims, three legal versions and sixteen migrations. Both exports and restored stores remain ignored/private; they contain synthetic sessions and must not enter the ZIP.

Separate read-only checks retained all eight original lead/enquiry IDs, six original deliveries, fourteen ledger entries, two claims and three legal versions in `.wrangler/installer-final-state`. Five later synthetic acceptance submissions raised its lead/enquiry count to thirteen. Completion switches were read back in all three exercised stores: collection/payments/notifications false, delivery/global pause true and test clock null. Runtime outbound remains false. No remote data, Time Travel or private production R2 was read.
