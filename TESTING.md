# Release verification — v0.1.0

Verified locally on 2026-10-08. The results below describe this preview, not a general recognition-accuracy benchmark.

| Check | Result |
| --- | --- |
| Host input/model contract and HTTP boundary checks | 16 Python tests passed |
| Five UI designs at 320, 390, and 480 px | Passed; no horizontal overflow or JavaScript errors |
| Save, reload, duplicate prevention, 46+46 kana, recall, sample cancellation | Passed across all five designs |
| Foil slider, saved finish edits, invalid image, failed upload preserving the photo | Passed |
| Reduced motion and WebKit smoke | Passed |
| Public site at 320, 390, 768, and 1440 px | Passed; images loaded, design switching and kana deep link worked |
| Public sample demo network boundary | No model/API requests during the tested flow; camera action stays in sample mode |
| Fresh Mac identity and repeated setup | Passed; existing identity preserved and new private key mode 0600 |
| Android signed release build | Gradle `assembleRelease` and release lint passed |
| APK signature | Verified with `apksigner`; dedicated SpiralDex RSA signer |
| Renamed Android app | Installed and launched on Android 16 / API 36.1 emulator; branding and new chair rendered; package is not debuggable |
| Apple Vision helper | Universal arm64 + x86_64 binary compiled; executed on Apple Silicon |
| Standalone live recognition | New chair sample → Apple Vision cutout → Gemma 3 12B → `椅子 / いす / isu / chair`, about 49 seconds |

The live scan used the generated chair asset, not a broad collection of real-world photographs. It demonstrates that the standalone host pipeline runs, not that the classifier is generally accurate. The public walkthrough is recorded from the real **sample UI** and does not imply a live camera scan.

The native camera, HTTPS pairing/upload, and local collection flow were exercised in the preceding app prototype. For the renamed release, the signature, package, build, installation, launch, and updated rendering were checked. A new physical-phone end-to-end scan and an Intel Mac runtime test remain unverified. Device-specific Japanese voice availability also varies.

Run the checks described in CONTRIBUTING.md. Test artifacts are intentionally kept outside the public repository so private photos, host addresses, and pairing details cannot enter documentation by accident.
