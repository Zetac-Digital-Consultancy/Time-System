// @ts-check
/** @type {import('@capacitor/cli').CapacitorConfig} */

// ---------------------------------------------------------------------------
// EDIT THESE VALUES BEFORE BUILDING FOR THE STORES
// ---------------------------------------------------------------------------
//
// 1. SERVER_URL — the PUBLIC https:// address where your ZeitTrack server is
//    hosted. The native app is a native shell that loads this URL. It MUST be
//    https for a real device / store build (Apple + Android both require it,
//    and your login cookies only become "Secure" over https).
//
//    - Store builds:   https://zeittrack.yourcompany.com
//    - Local testing on a phone on the same Wi-Fi: temporarily use your PC's
//      LAN IP, e.g. http://192.168.1.20:3000 (cleartext auto-enables for http).
//
//    Override without editing this file:  ZEITTRACK_URL=https://... npx cap sync
//
// 2. appId — reverse-domain identifier baked into the native projects. Change
//    it to your own domain BEFORE running `cap add android` / `cap add ios`.
//    Changing it afterwards means regenerating the native folders.
// ---------------------------------------------------------------------------

const SERVER_URL = process.env.ZEITTRACK_URL || "https://time-system.zetac.de/login";
const IS_HTTPS = SERVER_URL.startsWith("https://");

const config = {
  appId: "com.zetac.timetrack",
  appName: "ZeitTrack",
  // Local fallback bundle. Shown only if the server can't be reached (offline).
  webDir: "www",
  server: {
    url: SERVER_URL,
    // Plain-http traffic is only allowed when you've deliberately pointed at an
    // http:// URL for local testing. Store builds stay https (cleartext false).
    cleartext: !IS_HTTPS,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#0b0b0f",
      showSpinner: false,
      androidSpinnerStyle: "large",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0b0b0f",
    },
  },
};

module.exports = config;
