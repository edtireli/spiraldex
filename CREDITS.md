# Credits and asset provenance

SpiralDex v0.3 includes GPL-3.0 card-effect code and distributes the combined app under GPL-3.0. Prior SpiralDex MIT notices remain in `licenses/MIT-SpiralDex-original.txt`. Sample object artwork was generated for this project with OpenAI's built-in image-generation tool on 2026-10-08, then copied into `web/assets/`; the original generated alpha is preserved. Screenshots and the walkthrough are captures of this project's actual sample UI.

## Image prompts

- **`web/assets/chair.png`** — “Use case: product-mockup. Asset type: transparent subject cutout for SpiralDex, a Japanese visual vocabulary app. Primary request: one unmistakably recognizable, physically accurate wooden dining chair, photographed as a premium catalog product. A simple honey oak chair with a gently curved backrest, four slender but solid legs and a normal flat wooden seat. Three-quarter front view, entire chair in frame, large centered object occupying 85 percent of a square canvas. Real wood grain, natural proportions, soft diffuse studio lighting. No room, floor, other objects, text, logos, watermark, drawn outlines or decorative effects. Truly transparent background, clean alpha edges. Structurally coherent geometry: four legs attached naturally under the seat, backrest attached to two rear uprights.”
- **`web/assets/apple.png`** — “Use case: product-mockup. Asset type: transparent vocabulary object cutout for SpiralDex. One ripe red apple, unmistakably recognizable, photorealistic premium catalog photography, short natural stem and one small green leaf. Full apple centered, fills 80 percent of a square canvas, three-quarter view, soft diffuse studio lighting, subtle authentic skin texture. Truly transparent background with clean alpha edges. No floor, no environment, no text, no brand, no watermark, no other objects.”
- **`web/assets/cup.png`** — “Use case: product-mockup. Asset type: transparent vocabulary object cutout for SpiralDex. One unmistakably recognizable ivory glazed ceramic drinking cup with a single curved handle, three-quarter front view slightly from above so the empty interior is visible. Photorealistic premium catalog product photo, gently rounded simple proportions, subtle warm highlights, soft diffuse studio light, full cup centered and fills 80 percent of a square canvas. Truly transparent background, clean alpha edges. No saucer, no liquid, no table or environment, no text, logo, watermark, no decorative effects.”

## Inspiration

- The classic Pokédex and collectible-card presentation informed the interaction direction. No Pokémon artwork, logos, or card scans are distributed here.
- [Simon Goellner's pokemon-cards-css](https://github.com/simeydotme/pokemon-cards-css), copyright 2022 Simon Goellner (@simeydotme), supplies the actual CSS effects under GPL-3.0. `web/vendor/pokemon-cards-css/` contains verbatim `cards.css`, `base.css`, `basic.css`, `reverse-holo.css`, `regular-holo.css`, and `trainer-gallery-holo.css` from commit `acb1197633e749a1fba4412231db2f6581586d00`, the full upstream license, and a SHA-256 manifest. `web/cards.css` adapts the image-face layout to readable HTML and supplies a CSS foil input; `card-renderer.js` drives the upstream pointer/rotation variables. No upstream card artwork or texture images are copied or fetched. Upstream files remain unchanged. Corresponding app source and build scripts are provided in the release source ZIP.

## Dependencies and platform components

- [AndroidX Core](https://developer.android.com/jetpack/androidx/releases/core), Android Gradle Plugin, [Gradle](https://github.com/gradle/gradle), and [Playwright](https://github.com/microsoft/playwright): Apache-2.0. Gradle's wrapper JAR is included for reproducible setup.
- [Pillow](https://github.com/python-pillow/Pillow): its HPND license. Installed separately in the Mac host environment.
- [Python](https://www.python.org/psf/license/), Android, macOS, Apple Vision, and device voices are supplied by their respective platforms.
- [Ollama](https://github.com/ollama/ollama) and [Gemma](https://ai.google.dev/gemma/terms) are separate installations. Model weights are not bundled and retain their own terms.
- The optional local dictionary is user-supplied; no JMdict dataset is included.

Third-party dependencies retain their licenses. See `licenses/Apache-2.0.txt` for the Apache license covering the included Gradle wrapper and AndroidX components.
