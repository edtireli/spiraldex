# Privacy and storage

SpiralDex has no account system, analytics SDK, advertising, or built-in telemetry.

The Android app re-encodes a selected photograph to JPEG (maximum 1600 pixels on its longest side) and sends it only to the HTTPS address you configure. It requires the exact SHA-256 certificate fingerprint you paired and a bearer token. The token is encrypted using an Android Keystore key. Backups of the app are disabled.

The Mac creates temporary images for foreground masking and model input and removes those temporary files afterward. It calls Ollama on loopback. SpiralDex does not write full input photos to a persistent log. Ollama, operating-system diagnostics, camera apps, keyboards, and voice providers have their own behavior and settings.

Saved cards include their isolated images and vocabulary in IndexedDB on that device. Clearing the app/browser data or uninstalling it deletes this collection. There is no cloud copy or recovery service. The original photo may still exist in the photo library or camera app you used; SpiralDex does not delete it.

Android pronunciation selects an installed Japanese voice that reports no network requirement. The browser demo uses a Japanese voice offered by the browser; that voice provider may use network services. The Mac preview can fall back to the macOS `say` voice.

The public demo does not request camera access or send pictures to a model API. Its prepared discoveries persist locally in a separate demo collection. GitHub Pages is the hosting provider and may collect standard request logs under GitHub's privacy policy.

Phone orientation is used locally to tilt cards and change their reflections. Orientation samples are neither stored nor uploaded. Sampling pauses when cards are not visible or the app is in the background. You can switch phone tilt off; only that preference is saved. System reduced-motion settings disable the effect. Browsers that require motion permission ask only after you tap the enable button.

Treat the pairing token like a password. The HTTPS host is intended for a trusted local network. Do not expose its port directly to the public internet. Regenerating an identity requires re-pairing the phone. Images and model text are treated as untrusted input; generated words and facts still need human review.
