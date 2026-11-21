# SolarMatch Installers

Open `/installers/app` to go straight to the Thai installer workspace. Add `?lang=en` for English. Installers use their existing SolarMatch account and company permissions. The iOS, Android and home-screen versions all load this same first-party origin.

![Thai sign-in, English enquiry and Thai visit booking on a 390-pixel phone](preview.webp)

The enquiry and visit screenshots use fictional review data.

## Try it locally

From the repository root, use Node 22.13+ and pnpm. These commands create an isolated local database with a fictitious database ID. Use a fresh store name if you already have a preview you want to preserve.

```sh
pnpm install --frozen-lockfile
node scripts/installer-local-setup.mjs
pnpm exec wrangler d1 migrations apply solarmatch-installer-local-test --config .installer-test/wrangler.jsonc --local --persist-to .wrangler/installer-mobile-preview
INSTALLER_LOCAL_STORE=installer-mobile-preview INSTALLER_LOCAL_TEST=true pnpm dev --hostname localhost --port 3000
```

On PowerShell, set the two environment variables with `$env:INSTALLER_LOCAL_STORE='installer-mobile-preview'` and `$env:INSTALLER_LOCAL_TEST='true'`, then run `pnpm dev --hostname localhost --port 3000`. Open `http://localhost:3000/installers/app`. A new database starts without an approved installer. The existing [synthetic demonstration](../docs/installer-demo-local.md) creates an approved example company, enquiries and locally captured provider events. Run its setup only against this dedicated loopback store. Its generated credentials and invitations stay in ignored local files.

| Device | Local entry |
| --- | --- |
| Browser | Open the app URL above. Browsers offering home-screen installation use an installer-scoped manifest. A disconnected launch offers a retry and stores no enquiry pages. |
| iPhone simulator | Open the Xcode project under `mobile/ios` on a Mac, choose an iPhone simulator and run Debug. The simulator reaches the Mac’s loopback server. |
| Android emulator or USB device | Start the loopback server, run `adb reverse tcp:3000 tcp:3000`, then run the Debug app in Android Studio from `mobile/android`. |

A physical iPhone’s loopback address belongs to the phone. For later on-device iPhone testing, configure an owner-approved HTTPS test origin. Each release project requires the operator to choose its origin. The existing live portal is disabled.

## Field workflow

Open a waiting enquiry to call, record who answered, draft a text, book a visit in Thailand time, record a quote, or close and reopen the enquiry. The current action appears in the dark card. After a successful stage change, the installer has a short Undo window. Each write checks the current workflow revision. Team notes retain their own revision and autosave path.

Phone and SMS controls open the device’s dialer and composer. Opening Messages creates a composer activity. The installer decides whether to send the message. Browser calendar export creates a one-hour ICS file locally. The native apps hand off the appointment time to the device. Sharing in LINE passes only the staff access link following an explicit tap. The signed-in app retains the portal’s existing account, credit, claim, terms and LINE workflows.

Only company-owned, consented enquiry data can enter the current projection. Estimates are reconstructed from saved assessment answers when the calculator has the required inputs. The exact historical result shown in the homeowner’s browser is not stored on the server. An unavailable estimate is omitted. The home-screen worker serves a generic offline page on a failed app navigation. It does not cache documents, API responses, staff links, or writes.

## Store preparation

Before submission, review the app on physical devices with a synthetic company, including text enlargement, VoiceOver/TalkBack, notes conflicts, calendar, cancellation and return from messaging/payment handoffs. Supply final bundle/application IDs, signing identities, store assets, privacy disclosures, an account deletion path, a reviewer-accessible test environment, and a decision on how the stores classify prepaid lead credits. Confirm the existing provider and business launch gates separately. App Review assesses the practical value of the native experience. Polish and field-test the enquiry workflow before submitting.

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)
- [Google Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)
- [SolarMatch installer launch readiness](../docs/launch-readiness/README.md)

## Design references

The owner’s *SolarMatch enquiry page: Next step design* supplies the enquiry workflow, bilingual copy and visual hierarchy. New Thai strings are drafts for native review. SolarQuotes’ installer feedback on showing suburb, claims and intake limits informed which jobs stay close to hand. Large labelled actions and a responsive layout support use in the field.

- [SolarQuotes installer app and version history](https://apps.apple.com/au/app/solarquotes/id1456563829)
- [W3C accessibility for older users](https://www.w3.org/WAI/older-users/)
- [Android touch targets](https://developer.android.com/guide/topics/ui/accessibility/apps)
