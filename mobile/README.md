# ZeitTrack — Native App (iOS + Android)

This folder is a **[Capacitor](https://capacitorjs.com/) native shell** for the
ZeitTrack web app. It produces real, installable iOS (`.ipa`) and Android
(`.aab`) apps that you can publish to the **App Store** and **Google Play**.

## How it works (the mental model)

```
  App Store / Google Play          Your hosted server (unchanged)
  ┌───────────────────────┐        ┌──────────────────────────────┐
  │  ZeitTrack native app │  https │  Next.js app  +  PostgreSQL   │
  │  (this mobile/ folder)│ ─────► │  (docker-compose.yml)         │
  │  = a native window    │        │  e.g. zeittrack.yourco.com    │
  └───────────────────────┘        └──────────────────────────────┘
```

- The native app is a **native window that loads your hosted web app**. Your
  server, database, login, and all screens stay exactly as they are today.
- **You still host the server** — that never goes away. The app stores only
  distribute the phone app; they do not run your backend. See "Hosting" below.
- Because your login is **email + password (cookies)**, not an OAuth redirect,
  it works cleanly inside the native shell with no extra work.

## What you need

| To build for | You need | Works on your Windows PC? |
|---|---|---|
| **Android** | [Android Studio](https://developer.android.com/studio) + JDK 17 | ✅ Yes |
| **iOS** | A **Mac** with Xcode (or a cloud-Mac: Codemagic, EAS, MacinCloud) | ❌ No — Apple requires macOS |

Store accounts (one-time / yearly):
- **Google Play**: $25 one-time — <https://play.google.com/console>
- **Apple Developer**: $99/year — <https://developer.apple.com/programs/>

---

## Step 0 — Host the server (required first)

The app needs a **public `https://` URL**. Your `docker-compose.yml` already
builds the whole stack; deploy it to any Linux host (a $5–10/mo VPS, Railway,
Render, Fly.io, etc.), point a domain at it, and put it behind HTTPS (Caddy,
Nginx, or the host's built-in TLS).

Then set that URL in **`capacitor.config.js`** → `SERVER_URL`, and set
`AUTH_URL` / `NEXTAUTH_URL` on the server to the same `https://` origin (so
login cookies become `Secure`).

> Private-but-in-the-store: you do **not** have to make the URL publicly
> discoverable. The app just needs to be able to reach it. Login gates
> everything, so only employees/owner with accounts get in.

---

## Step 1 — Configure the app

Edit **`capacitor.config.js`**:

1. `SERVER_URL` → your hosted `https://` address.
2. `appId` → your own reverse-domain id (e.g. `com.yourcompany.zeittrack`).
   ⚠️ Change this **before** running `cap add` — it's baked into the native
   projects. It's also your permanent app identity in both stores.

Then sync the config into the native project(s):

```bash
cd mobile
npm install          # first time only
npx cap sync
```

---

## Step 2 — Build & run Android (on this PC)

```bash
cd mobile
npx cap add android      # already done once; skip if the android/ folder exists
npx cap open android     # opens Android Studio
```

In Android Studio:
- **Run** on an emulator or a USB-connected phone to test.
- To ship: **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**.
  Create a signing keystore when prompted and **keep it safe forever** — you
  need the same key for every future update.

Upload the `.aab` at <https://play.google.com/console> → create app → Internal
testing or Production. For an internal-only tool, use **Internal testing** or a
**Closed testing** track and add employees by email — this keeps it private
while still being a real Play Store app.

---

## Step 3 — Build & submit iOS (needs a Mac)

On a Mac with this repo:

```bash
cd mobile
npm install
npx cap add ios
npx cap open ios         # opens Xcode
```

In Xcode: set your Team (Apple Developer account), a Bundle Identifier matching
`appId`, then **Product → Archive → Distribute App**. Upload to App Store
Connect (<https://appstoreconnect.apple.com>).

For internal/private distribution, choose **TestFlight** (up to 10,000 users by
email, no full public listing) or, if you want it publicly listed, submit for
App Review.

> **Apple review note (important):** Apple can reject apps that are "just a
> repackaged website" ([guideline 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality)).
> Mitigations, in order of value: (a) add a native feature — push
> notifications or Face ID unlock are the usual ones; (b) distribute privately
> as a **Custom App via Apple Business Manager** (built for exactly this
> internal-company case and skips public review); (c) use TestFlight. If you
> want, ask and I'll wire up push notifications / biometric unlock to make the
> submission bulletproof.

---

## Everyday workflow

You rarely rebuild the app. Because it loads your live server, **shipping a web
change = deploying your Next.js server** — the app picks it up instantly. You
only rebuild and re-submit the native app when you change:
- the app icon / splash / name,
- native plugins (e.g. adding push notifications),
- the Capacitor/OS version.

```bash
# after changing web code: just deploy the server — nothing to do here.
# after changing native config/icons:
cd mobile && npx cap sync && npx cap open android   # (or ios)
```

## App icon & splash screen

Drop a 1024×1024 PNG and generate all sizes with:

```bash
npm install -g @capacitor/assets
# put icon at mobile/assets/icon.png and splash at mobile/assets/splash.png
npx @capacitor/assets generate
```

## Notes

- `android/` and `ios/` are git-ignored until you start customizing native code
  (icons, signing, plugins). When you do, un-ignore and commit them so your
  icons and signing config are versioned. See `.gitignore`.
- Local device testing without deploying: set `SERVER_URL` to your PC's LAN IP
  (`http://192.168.x.x:3000`), run `npm run dev` in the project root, and
  `npx cap sync`. Switch back to the `https://` domain before building for
  release.
