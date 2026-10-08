# Release verification — v0.2.0

Verified locally on 2026-10-08. These checks describe this preview, not a general recognition-accuracy benchmark.

| Check | Result |
| --- | --- |
| Host contract, HTTP boundary, status, and card-profile parity | 24 Python tests passed |
| Camera-first launch and fixed-screen layout | No starter objects or bottom navigation; scanner, cards, and kana fit 320×568 through 430×932 |
| Capture-to-card flow | Automatic upload, real stage polling, complete stats, automatic save, reload, and duplicate prevention passed with controlled API responses |
| Scan interruption | Cancellation ignores late responses; errors retain the photo; tap-to-select retry and invalid image handling passed |
| Storage limits | Full storage is reported honestly; save retry succeeds and survives reload |
| Existing collections | Real v0.1 discoveries retained; bundled starter entries filtered out |
| Navigation and learning | Rightward touch gestures, D-pad, keyboard, inspection, and all 46+46 paged kana passed |
| Browser engines | Chromium suite and WebKit interaction/layout smoke passed; reduced motion respected |
| Earlier design studies | All four retained concepts passed save/reload, deduplication, kana, recall, cancellation, and 320–480 px checks |
| Public project page | 320–1440 px checks, images, design switching, and kana deep link passed |
| Public demonstration boundary | Zero model/API requests during the tested flow; camera action plays prepared discoveries |
| Android build and signature | Signed release build and release lint passed; same dedicated SpiralDex signer as v0.1 |
| Android update | Installed over the existing APK and launched on Android 16 / API 36.1 emulator; full-screen scanner and actual rightward swipes checked |
| Apple Vision helper | Universal arm64 + x86_64 binary compiled; executed on Apple Silicon |
| Live generation | Cup fixture → Apple Vision cutout → Gemma 3 12B → `コップ / こっぷ / koppu / cup`, with a hiragana example, household type, rarity, HP, and all three field ratings; 57 seconds |
| Running phone host | Restarted with the existing identity; authenticated health and scan-status endpoints return HTTP 200 |

The live scan used the generated cup asset. It establishes that segmentation and the new card contract work together; it does not establish recognition accuracy on arbitrary photos. The model initially returned romanization in hiragana fields; this was rejected, then fixed with generation-time schema constraints and explicit prompt examples. Post-generation validation remains in place.

The public screenshots and walkthrough are captured in a fresh, isolated **demonstration** context. They contain no private photographs, collection data, or pairing credentials and do not imply live recognition.

A physical-phone scan of this exact updated build and execution on an Intel Mac remain unverified. Installed Japanese voices vary by device. Saved entries remain local; uninstalling or clearing app data deletes them. Install updates over the existing APK.

Run the checks in CONTRIBUTING.md. Diagnostic images and model output are kept in ignored `test-results/`, outside the public repository.
