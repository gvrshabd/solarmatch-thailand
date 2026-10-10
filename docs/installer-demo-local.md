# Synthetic installer demonstration (isolated local database only)

Use the dedicated `.installer-test/preview.jsonc` config, fictitious D1 database ID, and a loopback bound Worker. Apply all local migrations before starting the compiled preview. `scripts/installer-local-setup.mjs` creates or extends ignored `.installer-test/.dev.vars` with independent random `LOCAL_ADMIN_PASSWORD`, `LOCAL_ADMIN_SESSION_SECRET`, and `LINE_CHANNEL_SECRET`. Restart the local preview after adding keys; do not put them in repository files, URLs or screenshots. Run these scripts with Node.js 22 or newer; this computer's default `node` is older, so use the bundled executable below.

Visit `http://localhost:3000/admin/local-access` and enter the generated `LOCAL_ADMIN_PASSWORD` value from the ignored file. The session is signed, HttpOnly, SameSite=Strict, scoped to `/admin`, and expires after an hour. The sign-in form requires the exact loopback origin. In other modes, this route is unavailable and existing Cloudflare Access identity remains required.

The repeatable setup signs into `preview-installer@example.test`, or creates and verifies that synthetic account and its company on a fresh isolated database. Supply a synthetic account password privately and run:

```powershell
$node = 'C:\Users\shabd\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node scripts/installer-local-setup.mjs
$syntheticPassword = Read-Host 'Synthetic installer password' -AsSecureString
$env:INSTALLER_DEMO_PASSWORD = [System.Net.NetworkCredential]::new('', $syntheticPassword).Password
& $node scripts/installer-demo-setup.mjs
Remove-Item Env:INSTALLER_DEMO_PASSWORD
Remove-Variable syntheticPassword
```

The setup records synthetic agreement evidence, approves the company, accepts current terms, configures Bangkok coverage and capacity, grants the one-time two-delivery trial, and creates five fictional verified contact requests through the normal assessment, captured SMS proof and lead submission APIs. It first checks that allocation waits at 08:59 Asia/Bangkok, withdraws the fifth request before dispatch, then pins the isolated test clock to 10:00 for normal delivery. It creates a local-test purchase through checkout and the payment fixture event, checks repeated payment and notification events, processes locally captured notifications, verifies scoped staff links before and after revocation, submits claims and approves one purchased-credit restoration; another claim remains submitted for review. The local fixture companies then exercise the lifetime three-recipient cap through the normal allocation service and ledger. Existing leads, trials, paid orders, deliveries and restorations are reused on reruns. It clears the test clock and returns collection, allocation, payments, messaging and the company to paused states even if setup fails.

The generated staff links are stored in ignored `.installer-test/demo-share-links.json`; the synthetic lead IDs used for repeatability are in ignored `.installer-test/demo-state.json`. Handle both as private local files. Open `http://localhost:3000/installers?lang=en` for the company portal or `http://localhost:3000/admin` for the admin dashboard. The admin installer panel shows approval, trials, ledger, claims, processing health and retry controls. Ambiguous homeowner SMS tasks require a separate administrator provider-evidence decision: accepted with a verified provider reference, or confirmed not sent before a controlled retry. Neither decision itself sends a message or charges a company. The LINE account link uses signed synthetic webhook events and local invitation capture; it does not contact LINE. Notification captures can be inspected only through the isolated local test endpoint; nothing is sent to fictional phone numbers.

The setup does not activate a real payment or messaging account, verify provider deliverability, or establish a real company contract. Never run it against a production database or non-loopback site.

The script checks both staff-link languages at a 375px mobile viewport and that each staff token resolves only its assigned delivery. It normally creates/verifies `isolated-installer@example.test` and a pending Synthetic Isolation Solar company, then confirms this authenticated company cannot read the primary company's enquiries, financial history or rotate its staff links. The secondary synthetic account uses the same privately supplied demo password. Both accounts exist only in the isolated local database.

Final demonstration: Synthetic Preview Solar is approved and paused, with four inbox enquiries (two trial, two paid), eighteen available credits, no reserved credits/debt, one approved purchased-credit claim and one submitted trial claim. Global collection, allocation, payments and notifications are disabled, and the test clock is cleared. View Credits for the twenty-credit synthetic purchase, delivery charges and two-credit restoration; Claims for the two examples; open an enquiry for staff-link controls. Private `.installer-test/demo-share-links.json` contains two current scoped staff links. Captured LINE/SMS previews are available from the loopback test endpoint only and are not evidence of actual provider delivery.

Local browser checks use the installed Chrome channel, matching the repository's Chromium test projects. Keep the native browser open if preferred; the script's headless check closes only its own browser. Never share captures, OTPs or bearer links with an external reviewer; the source review package intentionally excludes them.
