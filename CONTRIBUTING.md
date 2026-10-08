# Working on SpiralDex

`web/` is the source of truth. After changing it, run `python3 scripts/sync-web.py` to update the Android bundle and sample-only public demo. The latter sets `data-demo="true"`; retain this boundary so a public page never posts user photos to an API.

## Checks

Install Python requirements in a virtual environment. Run:

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
npm ci
npx playwright install chromium webkit
python3 host/server.py --port 8139
```

In another terminal, with the server running:

```sh
npm test
BASE_URL=http://127.0.0.1:8139 npm run test:concepts
```

Serve `docs/` on port 8142 before running the browser suites; `npm test` checks both the live shell with mocked scans and the isolated public demo. Run `node tests/site.cjs` and `node tests/cards.cjs` for the project page. `BASE_URL` overrides the core UI test host and `DEMO_URL` overrides the site URL. `CHROMIUM_PATH` / `WEBKIT_PATH` optionally select installed browser executables. Screenshots and reports go in ignored `test-results/`.

`node scripts/capture-demo.cjs` refreshes public screenshots from the public demonstration. Keep photographs, credentials, and personal collections out of committed media. Run it with a fresh browser context.

## Android

Use JDK 17+ and Android SDK platform 34. Set `ANDROID_HOME` or create ignored `android/local.properties` with your SDK path.

```sh
python3 scripts/sync-web.py
cd android
./gradlew :app:assembleDebug
```

The release application ID is `app.spiraldex`; debug builds use `app.spiraldex.debug` so testing does not replace an installed release. The native shell only loads bundled web content. The JavaScript bridge allows photo capture, Japanese TTS, pairing settings, local orientation samples, and three fixed API routes (health, scan, and per-scan status). Preserve this small interface.

`node tests/motion.cjs` verifies orientation calibration, portrait/landscape axes, touch priority, permission denial, reduced motion, saved preferences, and native subscription lifecycle in the browser. `web/card-motion.js` maps local rotation matrices into the upstream card properties. Android subscribes to the game rotation vector (rotation vector fallback) only while card views are visible and the activity is resumed, at 20 Hz. No sensor data is persisted or sent to the host. Browser permission requests must remain inside a user gesture. API references: [Android sensors](https://developer.android.com/develop/sensors-and-location/sensors/sensors_overview) and [browser orientation permission](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static).

For the native sensor check, install and open the debug APK on a disposable Android emulator. Forward its `webview_devtools_remote_<pid>` socket to localhost port 9224 with `adb forward`. Run `ANDROID_SERIAL=emulator-5554 node tests/android-motion.cjs` (`ADB_PATH` and `ANDROID_CDP_URL` can override the defaults). It injects emulator sensor values, checks the real bridge and lifecycle, then restores the original sensor values. It refuses physical-device serials.

## Signed local releases

Keep a dedicated keystore outside the repository, back it up privately, and never commit its password. Create ignored `android/signing.properties`:

```properties
storeFile=/absolute/private/path/spiraldex.jks
storePassword=YOUR_PRIVATE_PASSWORD
keyAlias=spiraldex
keyPassword=YOUR_PRIVATE_PASSWORD
```

Run `python3 scripts/build-release.py` on macOS with JDK and Android SDK configured. It compiles the signed APK and universal Mac helper, then packages the Mac host and static demo with SHA-256 checksums in ignored `dist/0.3.1/`. The version is declared in `package.json`, `android/app/build.gradle`, and the publish script; the build script reads `package.json`. Update version declarations together for a new release.

`scripts/publish.command` is an explicit maintainer action run in Terminal. It creates `edtireli/spiraldex` only if absent, pushes the prepared commit/tag, uploads the existing release files, and enables Pages from `main:/docs`. It does **not** compile code, download models, or consume a CI build runner. It refuses to overwrite existing release assets with different content. GitHub's own Pages deployment still runs to serve the static files.

## Review expectations

For UI changes, check 320 px and a normal phone width, keyboard focus, reduced motion, empty/error states, and the offline path. For the host, validate image limits and model output and retain temporary-file cleanup. A successful UI test is not evidence that a model labels arbitrary real-world objects correctly.

## Card generation

`host/card_profile.py` and `web/card-profile.js` implement the same versioned profile calculation; parity tests prevent platform drift. Rarity and finish must come from validated model fields; never roll rarity from a word hash. Keep generated text separate from the fixed renderer. The schema constrains types, hiragana scripts, rarity, and finish combinations; see [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs). The host emits real extraction/model stages through an authenticated status route. Use field-guide language in the scanner; keep connection details in settings.

The card renderer loads verbatim upstream CSS from `web/vendor/pokemon-cards-css/`. Keep its license and hash manifest with the assets. Integration overrides belong in `web/cards.css`. The release script includes a corresponding-source ZIP from tracked files; stage new source files before packaging.

The HTML print is laid out at 600 px and uniformly scaled with ResizeObserver; the upstream shine/glare layers stay at the displayed card size. Keep all print typography inside that fixed container to avoid Android's minimum-font clamping. Run `node tests/card-layout.cjs` for long-entry layout, archive pagination, and both swipe directions in Chromium/WebKit. Archive captions remain ordinary readable text outside the scaled print.
