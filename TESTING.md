# Release verification — v0.3.1

Verified locally on 2026-10-08. These checks describe this preview, not a general recognition-accuracy benchmark.

For v0.3.1, the card-layout, navigation, existing UI, and card-effect checks were rerun. Host/model checks below are retained evidence from v0.3.0; host generation code is unchanged.

| Check | Result |
| --- | --- |
| Host contract, rarity/finish combinations, HTTP boundary, status, and profile parity | 27 Python tests passed |
| Actual upstream card styles | Six CSS files verified byte-for-byte against the pinned manifest and confirmed loaded in the browser; all four treatments respond to touch/pointer variables |
| Card geometry and assets | Trading-card aspect ratio 0.718 verified, mobile studio fits 320 px, no remote image/texture requests, reduced motion disables tilt |
| Archive scaling | Complete print scales uniformly; long entries, 1/2/7-item collections, pagination, card opening, and inspection fit 320–430 px in Chromium and WebKit; Android WebView checked with its default minimum font size |
| Phone orientation | Browser suite passed relative calibration, upright/landscape rotation, bounded tilt/translation, touch priority, saved Off preference, permission denial/retry, reduced motion, and missing-sensor fallback |
| Native motion integration | Android emulator sensor input drove the debug app's rotation, translation, and foil properties through the native bridge; background pause/resume, Off, and reduced motion stopped/resumed native callbacks correctly |
| Rarity persistence | Model-selected Rare/holo survives automatic saving and reload; unassessed old entries never inherit a hash-based rarity |
| Camera-first launch and fixed-screen layout | No starter objects or bottom navigation; scanner, cards, and kana fit 320×568 through 430×932 |
| Capture-to-card flow | Automatic upload, real stage polling, complete stats, automatic save, reload, and duplicate prevention passed with controlled API responses |
| Scan interruption | Cancellation ignores late responses; errors retain the photo; tap-to-select retry and invalid image handling passed |
| Storage limits | Full storage is reported honestly; save retry succeeds and survives reload |
| Existing collections | Real discoveries retained; bundled starter entries filtered out; older cards without model rarity are marked Unassessed |
| Navigation and learning | Either first swipe advances left dot → middle → last; reversing goes back and the last dot does not wrap. D-pad, keyboard, inspection, and all 46+46 paged kana passed |
| Browser engines | Chromium suite and WebKit interaction/layout smoke passed; reduced motion respected |
| Earlier design studies | All four retained concepts passed save/reload, deduplication, kana, recall, cancellation, and 320–480 px checks |
| Public project page | 320–1440 px checks, images, design switching, and kana deep link passed |
| Public demonstration boundary | Zero model/API requests during the tested flow; camera action plays prepared discoveries |
| Android build and signature | Signed release build and release lint passed; same dedicated SpiralDex signer as v0.1 |
| Android packaging | Current HTML, motion controller, all six vendor styles, renderer, and upstream license verified inside the signed APK; camera/pairing behavior retained |
| Apple Vision helper | Universal arm64 + x86_64 binary compiled; executed on Apple Silicon |
| Live generation | Cup fixture → Apple Vision cutout → Gemma 3 12B → `コップ / こっぷ / koppu / cup`, with model-selected **Common / classic**, reason “Cups are a very common household item,” and all three field ratings; 35 seconds |
| Running phone host | Restarted with the existing identity; authenticated health and scan-status endpoints return HTTP 200 |

The live scan used the generated cup asset. It establishes that segmentation and the new card contract work together; it does not establish recognition accuracy on arbitrary photos. Hiragana remains constrained during generation and validated afterward. The model supplies rarity, rationale, and finish; incompatible combinations are rejected. This single cup check is not a broad rarity/recognition benchmark.

The public screenshots and walkthrough are captured in a fresh, isolated **demonstration** context. They contain no private photographs, collection data, or pairing credentials and do not imply live recognition.

A physical-phone scan and physical-device sensor feel for this exact updated build, plus execution on an Intel Mac, remain unverified. Orientation behavior was checked with synthetic browser events and the Android emulator's simulated sensor input. Installed Japanese voices vary by device. Saved entries remain local; uninstalling or clearing app data deletes them. Install updates over the existing APK.

Run the checks in CONTRIBUTING.md. Diagnostic images and model output are kept in ignored `test-results/`, outside the public repository.
