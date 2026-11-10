# Publishing Glide

The Figma Make workspace is the React/Vite web application. The existing GitHub
repository at `baranaikooo/glide` also contains the native Android shell and the
older web implementation. Keep those native files; publish this workspace into
the repository's `web/` directory rather than replacing its root application.

## Web deployment

The repository's Vercel configuration installs the root Capacitor dependencies
with npm and the web dependencies with pnpm 10.34.3 and its frozen lockfile. It
runs the Vite production build in `web/` and serves `web/dist/`. A push to `main`
triggers the existing Vercel integrations.

Use `pnpm install --frozen-lockfile` and `pnpm build` inside `web/`. This uses the
same dependency versions as the verified Figma Make workspace. Do not include
secrets, dependency folders, or Git history in an export.

## Android

The native repository's Capacitor `webDir` points to `web/dist`. Build the web
application, run `npx cap sync android` from the repository root, then build the
APK with its existing Gradle workflow. This ensures Android uses the same
interface as the deployed web application instead of stale bundled HTML.
The interface supports both browser safe-area environment values and Capacitor
SystemBars' injected CSS inset variables.

The GitHub APK workflow builds Vite and synchronizes Capacitor before building
Android. Keep the synchronized `android/app/src/main/assets/` files committed
for local builds as well. Each source push publishes a uniquely versioned APK
with a permanent signing identity. See `android-updates.md` for update behavior
and required repository signing secrets.

## ZIP backup

The complete distributable ZIP includes source, public assets, configuration,
the built web application, and the preserved Android shell. It excludes
`node_modules`, `.git`, environment files, and build caches. It is created in the
workspace's `artifacts/` directory and published in the GitHub repository's
`downloads/` directory for direct download.
