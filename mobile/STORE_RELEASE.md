# SolarMatch Installers: App Store and Google Play release checklist

Checked 24 November 2026 against the official Apple and Google pages linked below. Nothing here has been submitted, signed or deployed. "Done" means implemented and tested locally; it is not store acceptance.

## What the store builds do differently

The iOS and Android apps load the same first-party installer workspace as the website. They append `SolarMatchInstallers/iOS` or `SolarMatchInstallers/Android` to the user agent, and the workspace changes two things for them:

- **No purchasing.** Credits shows the balance, the statement and how charging works, plus one neutral line: “Credits can’t be bought in this app.” There is no Pay button, QR code, link or instruction to buy elsewhere. The website and the installable web app keep the existing Omise purchase flow. This keeps the store builds inside Apple’s free stand-alone companion rule (Guideline 3.1.3(f)) and Google Play’s consumption-only allowance, whatever the owner later decides about in-app billing.
- **Calendar hand-off.** A visit opens the native calendar editor instead of downloading an `.ics` file.

## Requirements and status

| Requirement | Source | Status |
|---|---|---|
| In-app account deletion, easy to find | Apple 5.1.1(v); Google Play User Data policy | **Done.** Company screen → “Your account” → “Delete account”, also linked from the account menu. Needs the current password; 5 attempts per 15 minutes. |
| Deletion must erase data, not deactivate | Apple account deletion notice; Google Play account deletion | **Done for the person’s account**: name, email, password, sessions, reset links and membership are erased at once; their email in company and audit records becomes `installer-user:<id>`. Company billing records are kept (see decisions). |
| Deletion path outside the app, named after the app | Google Play account deletion | **Done:** `/installers/delete-account` (Thai, `?lang=en` for English). Enter `https://<release origin>/installers/delete-account` in Play Console. |
| No in-app sale of digital goods without IAP / Play Billing | Apple 3.1.1 and 3.1.3(f); Google Play Payments policy | **Done** for store builds (purchasing hidden). In-app billing remains an owner decision. |
| Target API level 36 for new apps and updates | Google Play target API policy (from 31 August 2026) | **Done:** `targetSdk 36`, `compileSdk 36`. |
| Built with Xcode 26 and an iOS 26 SDK | Apple upcoming requirements (from 28 April 2026) | **Needs a Mac.** Project targets iOS 17+; not built or launched on this machine. |
| Privacy policy URL and privacy labels | Apple App Privacy; Google Play Data safety | **Owner input.** Draft answers below. |
| Reviewer can sign in and use the app | Apple App Review; Google Play app access | **Owner input.** Needs a reachable HTTPS review environment with a synthetic company (see blockers). |
| Closed test before production | Google Play, personal developer accounts created after 13 Nov 2023 | **Owner input.** 12 testers opted in for 14 consecutive days, unless the account is an organisation account. |
| Minimum functionality beyond a website | Apple 4.2 | **Risk.** See recommendation below. |

## Launch blockers, in priority order

Items marked **You** need the owner; the rest are engineering.

1. **You: release origin and review environment.** Choose the HTTPS origin the release builds load (`installerReleaseOrigin` for Android, `INSTALLER_PORTAL_ORIGIN` for iOS). Reviewers must reach it without Cloudflare Access, with a synthetic approved company, a reviewer account and enquiries to act on. Production is off (`INSTALLER_PLATFORM_MODE: "off"`), so this is either a dedicated review deployment or an approved production activation. Without it, both stores will reject the app as not reviewable.
2. **Device testing on real phones (engineering, needs hardware).** Android: run the debug APK on an emulator or phone with `adb reverse` and walk the checklist in `mobile/README.md`. iOS: build in Xcode 26 on a Mac and run in a simulator, then on an iPhone against the review origin. The Android and iOS shell changes in this branch have **not been compiled**.
3. **You: legal retention period and the deletion timeline.** Deletion erases the person’s account at once. When they were the company’s last member, intake is paused, LINE is disconnected and `installer_account_deletions.company_review_required = 1`. Decide how long company orders, ledger, claims and audit records are kept, then state it on `/installers/delete-account` (marked `OWNER DECISION` in the source) and in the privacy policy.
4. **You: refund handling for unused purchased credits on deletion.** The shutdown refund principle is confirmed, but the approval and execution process is not. The deletion record flags the company for review; an operator must settle credits by hand until that process exists.
5. **You: billing classification.** Store builds sell nothing, which is the safe default. Choosing App Store IAP or Play Billing for credits, or the US external-link programmes, is a commercial and fee decision. Do not re-enable the Pay buttons in store builds without one.
6. **You: signing and identifiers.** Apple Developer team, bundle ID (project default `th.solarmatch.installers`), Play app signing key and package name (`th.solarmatch.installers`). Keep keys out of the repository.
7. **You: store listing.** App name, Thai and English descriptions, support URL, privacy policy URL, screenshots (`tests/e2e/installer-app-screens.spec.ts` captures every state at 390 px in both languages with fictional data), and age rating (no user-generated public content; business users only).
8. **You: Thai copy review.** New Thai strings are drafts and are marked “needs native review” in the source.
9. **Engineering recommendation: push notifications for new enquiries.** Apple can reject thin web wrappers under 4.2. Native dialer, SMS and calendar hand-offs, Dynamic Type and offline handling help, but native push alerts for a new enquiry would be the strongest native feature and the most useful one for installers in the field. LINE alerts already exist; push would need APNs and FCM accounts (**You**) plus a server sender.

## Draft privacy answers (for the owner and counsel to confirm)

Data the installer account provides and the server keeps, all linked to the account and used only for app functionality and account management. No advertising, no tracking, no third-party analytics or crash SDKs in the app.

- **Contact info:** name, email, company phone and contact name.
- **User content:** team notes, claim details, quote amounts, visit times and close reasons for enquiries.
- **Identifiers:** account user ID.
- **Purchase history:** credit orders and ledger made on the website (shown in the app, not purchased in it).
- **Other people’s data shown to the installer:** homeowner name, phone, area and assessment answers for enquiries delivered to their company. Counsel should confirm how to describe this in Apple’s and Google’s forms; it is collected on the homeowner website, not through the app.
- **Encryption in transit:** yes. Release builds accept only the configured HTTPS origin.
- **Deletion:** in the app and at `/installers/delete-account`.

## Sources

- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (3.1.1, 3.1.3(f), 4.2, 5.1.1(v))
- [Apple: account deletion within apps](https://developer.apple.com/news/upcoming-requirements/?id=06302022b)
- [Apple: SDK minimum requirements](https://developer.apple.com/news/upcoming-requirements/?id=04282026a)
- [Google Play: account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Google Play: Payments policy](https://support.google.com/googleplay/android-developer/answer/10281818)
- [Google Play: target API level](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Google Play: testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465)
