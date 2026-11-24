# SolarMatch Installers for Android

Open this directory as a Gradle project in Android Studio. The project uses JDK 17, Android SDK Platform 36, Build Tools 35.0.0 and the included Gradle wrapper. It supports Android 8.0 and up. The debug application ID has a separate `.debug` suffix.

## Run the synthetic local portal

1. Start the isolated preview with the repository’s [local demonstration setup](../../docs/installer-demo-local.md), using the config whose base URL is `http://localhost:3000`. Verify that `http://localhost:3000/installers/app` opens on the development computer.
2. Connect an Android emulator or USB debugging device. Run `adb reverse tcp:3000 tcp:3000` so that the phone sees the same origin and cookie scope as the development computer.
3. Press **Run** in Android Studio, or run `./gradlew :app:installDebug` and open **SolarMatch Installers** on the device. On Windows, use `gradlew.bat`. Use only the synthetic account from the local setup.

Run `./gradlew :app:assembleDebug :app:testDebugUnitTest` to build the debug APK and check navigation, protocol and system-editor handling. The APK is at `app/build/outputs/apk/debug/app-debug.apk`.

The app opens the installer workspace in Android System WebView. Sign-in stays on the configured origin, and Android keeps the secure session cookies in the app’s private WebView store. Dial and SMS open system editors. A site visit opens a one-hour event in the calendar editor. The user completes these actions in the receiving app. External HTTPS links, including user-selected LINE staff sharing, show the destination host before opening. If the initial connection fails, a bilingual retry screen reopens the workspace.

## Preparing a release

Verification links opened by an email app use the system browser. After verification, return to the installer app and sign in. Same-origin verification and payment-status pages reached within the app keep its own session. Exercise the approved provider’s sandbox return flow on a device before enabling billing.

Release builds require the Gradle property `installerReleaseOrigin` to contain the approved bare HTTPS portal origin. The regular release build has no default network destination or signing credentials. Confirm the package identifier, configure owner-controlled signing and complete store review before distribution. Debug HTTP is restricted to localhost.
