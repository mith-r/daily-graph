# Daily Graphs — iOS App Setup (Capacitor, remote-URL mode)

One codebase, web stays live, app loads thedailygraphs.com in a native shell
with native plugins layered on top.

## Prerequisites
- A Mac with Xcode 15+ installed (required to build iOS apps)
- Node 20+ (you already have this for Next.js)
- Apple Developer account ($99/yr) — needed for TestFlight and the App Store
- CocoaPods: `sudo gem install cocoapods` (Capacitor uses it for iOS deps)

## 1. Install Capacitor (run in the repo root)
```bash
npm install @capacitor/core
npm install -D @capacitor/cli
npm install @capacitor/ios
```

## 2. Add the config
Drop `capacitor.config.ts` (provided) into the repo root, next to
`next.config.ts`. Adjust:
- `appId` — reverse-DNS bundle ID; must match what you register with Apple
- `server.url` — your production URL
- `backgroundColor` — your exact navy hex from globals.css/Tailwind config

Note on `webDir`: Capacitor demands a folder of web assets even though we're
loading a remote URL. Pointing it at `public/` satisfies it without a build
step. (Don't use `npx cap init` — it would overwrite this config; we're
configuring manually.)

## 3. Generate the iOS project
```bash
npx cap add ios
npx cap sync ios
```
This creates an `ios/` folder — commit it to the repo. It's the native shell;
it changes rarely.

## 4. Open in Xcode and run
```bash
npx cap open ios
```
In Xcode:
1. Select the `App` target → Signing & Capabilities → pick your Apple team
2. Choose a simulator (e.g. iPhone 16) and hit Run
3. The app should boot straight into the live site; log in to confirm the
   session cookie persists across app relaunches

## 5. App icon & splash screen
```bash
npm install -D @capacitor/assets
```
Put a 1024x1024 `icon.png` and 2732x2732 `splash.png` in an `assets/` folder,
then:
```bash
npx capacitor-assets generate --ios
```

## 6. Add native touches (Apple review insurance)
Apple rejects bare website wrappers (guideline 4.2), so add at least:

**Push notifications** — the killer feature for a daily app:
```bash
npm install @capacitor/push-notifications
npx cap sync ios
```
Then enable the Push Notifications capability in Xcode and set up APNs keys in
your Apple Developer account. Server-side, you'll add a small endpoint to store
device tokens (a Redis set fits your stack) and a daily cron (Vercel cron works)
that sends "Today's graph is up" via APNs.

**Haptics** on dot placement:
```bash
npm install @capacitor/haptics
```
In your web code, guard it so the site is unaffected:
```ts
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

if (Capacitor.isNativePlatform()) {
  await Haptics.impact({ style: ImpactStyle.Light });
}
```
Good spots: confirming a placement in HomeClient, long-press interactions.

## 7. Day-to-day workflow after setup
- Normal web changes: deploy to Vercel as usual → the app updates instantly,
  no App Store submission
- Native changes (new plugin, icon, iOS settings): `npx cap sync ios`, bump
  the build number in Xcode, upload a new build
- Nothing is ever pushed twice — `src` of truth is this one repo

## 8. Ship it
1. In Xcode: Product → Archive → Distribute App → App Store Connect
2. In App Store Connect: create the app listing (screenshots, description,
   privacy details — you'll need a privacy policy URL)
3. Release to TestFlight first, test on real devices
4. Submit for review. In review notes, call out the native features
   (push notifications, haptics) and provide a demo login

## Gotchas specific to this repo
- **Auth**: cookie sessions work in the WebView since you're loading your real
  domain. If you ever move to Path B (bundled static build), you'd need
  token-based auth instead.
- **DEBUG flags**: per your README, make sure `DEBUG_BYPASS_AUTH` and
  `USE_IN_MEMORY_REDIS` stay unset in prod — the app loads prod directly.
- **External links**: links to other domains will open inside the WebView by
  default. Install `@capacitor/browser` or configure `allowNavigation` so only
  thedailygraphs.com stays in-app.
- **Offline**: remote-URL mode shows an error if the user has no connection.
  Acceptable for v1; Path B solves it later if it matters.
