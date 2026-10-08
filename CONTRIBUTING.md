# Working on SpiralDex

`web/` is the source of truth. After changing it, run `python3 scripts/sync-web.py` to update the Android bundle and sample-only public demo. The latter sets `data-demo="true"`; retain this boundary so a public page never posts user photos to an API.

## Checks

Install Python requirements in a virtual environment. Run:

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
npm ci
npx playwright install chromium webkit
python3 host/server.py --port 8138
```

In another terminal, with the server running:

```sh
npm test
node tests/edge-cases.cjs
```

Serve `docs/` on port 8142, then run `node tests/site.cjs`. `BASE_URL` overrides the core UI test host and `DEMO_URL` overrides the site URL. `CHROMIUM_PATH` / `WEBKIT_PATH` optionally select installed browser executables. Screenshots and reports go in ignored `test-results/`.

`node scripts/capture-demo.cjs` refreshes public screenshots from the real sample UI. Keep photographs, credentials, and personal collections out of committed media. Run it with a fresh browser context.

## Android

Use JDK 17+ and Android SDK platform 34. Set `ANDROID_HOME` or create ignored `android/local.properties` with your SDK path.

```sh
python3 scripts/sync-web.py
cd android
./gradlew :app:assembleDebug
```

The application ID is `app.spiraldex`. The native shell only loads bundled web content. The JavaScript bridge allows photo capture, Japanese TTS, pairing settings, and two fixed API routes. Preserve this small interface.

## Signed local releases

Keep a dedicated keystore outside the repository, back it up privately, and never commit its password. Create ignored `android/signing.properties`:

```properties
storeFile=/absolute/private/path/spiraldex.jks
storePassword=YOUR_PRIVATE_PASSWORD
keyAlias=spiraldex
keyPassword=YOUR_PRIVATE_PASSWORD
```

Run `python3 scripts/build-release.py` on macOS with JDK and Android SDK configured. It compiles the signed APK and universal Mac helper, then packages the Mac host and static demo with SHA-256 checksums in ignored `dist/0.1.0/`. The version is declared in `package.json`, `android/app/build.gradle`, and the build/publish scripts; update them together for a new release.

`scripts/publish.command` is an explicit maintainer action run in Terminal. It creates `edtireli/spiraldex` only if absent, pushes the prepared commit/tag, uploads the existing release files, and enables Pages from `main:/docs`. It does **not** compile code, download models, or consume a CI build runner. It refuses to overwrite existing release assets with different content. GitHub's own Pages deployment still runs to serve the static files.

## Review expectations

For UI changes, check 320 px and a normal phone width, keyboard focus, reduced motion, empty/error states, and the offline path. For the host, validate image limits and model output and retain temporary-file cleanup. A successful UI test is not evidence that a model labels arbitrary real-world objects correctly.
