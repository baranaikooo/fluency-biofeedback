# Android updates

The Android shell registers `GlideUpdatesPlugin` before the Capacitor bridge is
created. The updater reads the installed package version from Android and
checks the public GitHub latest release at launch, on returning to the app, and
when connectivity returns. A manual check is available under Telemetry.
No account or token is required by the application.

Only a completed non-prerelease with tag `v1.0.N` and an uploaded
`glide-native.apk` from this repository is accepted. The corresponding Android
version code is `100 + N`. Equal or older versions are never offered. “Neskôr”
hides the current offer for that app session. Offline failures leave training
available and do not remove an already-known update.

“Stiahnuť aktualizáciu” opens the exact APK asset in the system browser, without
visiting a GitHub page. The user opens the downloaded APK and confirms Android's
installation prompt. Android may first request permission to install apps from
that browser. Installation is not silent.

Every main-branch source change builds the web app, synchronizes Capacitor, and
publishes a new uniquely tagged APK. GitHub's workflow run number supplies `N`.
The `GLIDE_SIGNING_KEYSTORE` and `GLIDE_SIGNING_PASSWORD` repository Actions
secrets hold the permanent signing identity. Never regenerate or replace them
for routine updates, and never publish builds signed by a temporary debug key.
The workflow fails if the permanent signing secrets are absent.

The first APK introducing this feature must be installed manually. Older APKs
were built with temporary debug keys, so Android may reject an in-place upgrade
from those builds. If so, reinstalling once is necessary; export any needed
local progress first or use the existing account synchronization. Later builds
signed with the new stable identity update in place and preserve app data.

ZIP-only distribution remains supported: put the installable APK inside the
complete ZIP and save that ZIP to Downloads. Never package signing keys, tokens,
dependency folders or Git history.
