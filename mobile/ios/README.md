# SolarMatch Installers for iOS

Open `SolarMatchInstallers.xcodeproj` with Xcode 15 or later, choose the SolarMatchInstallers scheme and an iOS 17+ iPhone or iPad simulator, and press Run. First run the [isolated local installer portal](../../docs/installer-demo-local.md) on the same Mac. The Debug build opens `http://localhost:3000/installers/app`. If your local Worker is configured for `http://127.0.0.1:3000`, set the target's `INSTALLER_PORTAL_ORIGIN` build setting to that exact origin. A simulator can use its Mac's loopback. A physical iPhone's loopback belongs to the phone.

The app keeps the website's session in WKWebView and opens the installer routes in place. Links from verification or password-reset emails can complete in the system browser. Return to the app to sign in. A tapped phone number opens the dialler. SMS opens an editable system message and appointments open an editable one-hour Calendar event. The system composer controls sending or saving. The Calendar handoff carries the time only. An explicit confirmation displays the destination host before an HTTPS link such as LINE opens outside the app.

For a future reviewed build, set `INSTALLER_PORTAL_ORIGIN` to the approved HTTPS origin. Release has no default host or cleartext exception. Confirm your own signing team, bundle identifier and version before archiving. Test verification and recovery, LINE linking, payment reconciliation after returning, SMS, Calendar and VoiceOver on an iPhone with an approved test environment before submission. Local provider fixtures exercise portal behavior and cannot establish device handoff or payment settlement.

## Local checks on a Mac

From this directory, run the origin and handoff cases and compile the simulator app.

```sh
tmpdir_ios=$(mktemp -d)
swiftc SolarMatch/PortalOrigin.swift PolicyTests/main.swift -o "$tmpdir_ios/policy-check"
"$tmpdir_ios/policy-check"
xcodebuild -project SolarMatchInstallers.xcodeproj -scheme SolarMatchInstallers -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath "$tmpdir_ios/DerivedData" CODE_SIGNING_ALLOWED=NO build
```
