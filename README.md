<p align="center"><img src="docs/media/mark.svg" width="68" alt="SpiralDex field unit"></p>
<h1 align="center">SpiralDex</h1>
<p align="center"><b>Your world, in Japanese.</b><br>A pocket field guide that turns everyday objects into words you remember.</p>
<p align="center"><a href="https://edtireli.github.io/spiraldex/">Explore the demo</a> · <a href="https://github.com/edtireli/spiraldex/releases/tag/v0.1.0">Download v0.1.0</a> · <a href="#quick-start">Get started</a></p>

![SpiralDex’s Classic Dex interface with a wooden chair, its Japanese name, and hiragana reading](docs/media/social.png)

Take a photo on your Android phone. Your Mac removes the background, identifies the subject with a local vision model, and drafts a Japanese vocabulary card. Check the result, tap to hear the word, and keep it in your collection.

SpiralDex brings the tactile red shell and discovery ritual of a classic handheld encyclopedia to the little things around you. Your morning cup becomes **カップ**. An apple becomes **りんご**. The language starts to feel like part of your world.

**Early preview:** Android 9+ · macOS 14+ · Ollama · MIT licensed. New scans need an awake Mac on the same network. This is an Android app with a Mac companion; there is no iOS release yet.

## See it in motion

<p align="center"><img src="docs/media/walkthrough.gif" width="340" alt="Recorded walkthrough of the real sample UI: discovery, a word card, holographic finish, saved collection, and kana."></p>

[Try the interactive Classic Dex](https://edtireli.github.io/spiraldex/demo/01-classic.html) — no account or model installation needed. The public demo uses curated samples; it does not upload photographs or perform recognition. Japanese audio uses a voice installed on your device.

<p align="center">
  <img src="docs/media/card.png" width="29%" alt="A Japanese vocabulary card for a chair">
  <img src="docs/media/collection.png" width="29%" alt="A saved collection of a chair, apple, and cup">
  <img src="docs/media/kana.png" width="29%" alt="The hiragana sound library">
</p>

## What you can do

- **Discover through your camera.** Capture or choose a photo, then tap the subject you want to learn.
- **Lift the subject out.** Apple Vision produces a transparent cutout on your Mac.
- **Make a word card.** Japanese spelling, hiragana reading, romanization, English meaning, a short example, and a usage note fill a fixed template.
- **Hear the language.** Tap words, examples, or kana. Android uses an installed Japanese voice, including a slower playback option.
- **Collect and recall.** Keep cards on your device, choose gold or green frames, try holographic finishes, and practice remembering the word.
- **Explore kana.** 46 basic hiragana and 46 basic katakana, with sounds and examples.
- **Use your own models.** HTTPS pairing, certificate pinning, and a private token connect the phone to your laptop. No cloud inference API is required.

## Quick start

### 1. Install the Android app

Download **`SpiralDex-0.1.0.apk`** from [Releases](https://github.com/edtireli/spiraldex/releases/tag/v0.1.0), open it on your Android device, and allow installation from that source when Android asks. The APK is signed with the project's release key. It is a direct installation preview, not a Play Store release.

### 2. Prepare your Mac

Install [Python 3](https://www.python.org/downloads/macos/) (3.10 or newer) and [Ollama](https://ollama.com/download/mac), then download the default vision model:

```sh
ollama pull gemma3:12b
```

Keep Ollama running. Gemma 3 12B is a substantial model; a Mac with 24 GB or more memory is recommended for this configuration. A different installed **vision-capable** model can be selected with `DEX_VISION_MODEL`; smaller alternatives have not been validated for this release.

Download **`SpiralDex-Mac-Host-0.1.0.zip`**, extract it, and open **`Start SpiralDex.command`**. If macOS blocks an unsigned downloaded launcher, use its Open / Privacy & Security approval flow. The launcher:

1. Creates a local Python environment and installs Pillow on first use.
2. Uses the included universal Apple Silicon / Intel subject-extraction helper.
3. Creates private pairing credentials in `~/.spiraldex`.
4. Displays your Mac's address, pairing token, and certificate fingerprint, then starts the host.

Keep this Terminal window open while scanning. Initial dependency and model downloads need an internet connection; inference runs locally afterward. The Mac host ZIP is a portable Python companion, not a notarized macOS application or a bundle of model weights.

### 3. Pair and discover

Keep the phone and Mac on the same trusted network. In SpiralDex, open the laptop icon → **Set up Mac connection**. Enter the HTTPS address (normally port `8445`), pairing token, and SHA-256 fingerprint shown in Terminal. Tap **Test connection**.

Choose **Camera**, capture or select a photo, tap the subject, and send it to the Mac. Check the resulting word and reading before saving. The first scan can take longer while the model loads.

Already use Spiral Chat? Set `SPIRALCHAT_GATEWAY_DIR` to its existing identity directory before starting the host. SpiralDex can reuse `config.json`, `cert.pem`, and `key.pem`; its service uses port `8445` independently of Spiral Chat. Existing files are never silently replaced.

## How it works

```mermaid
flowchart LR
    A[Android camera / photo picker] -->|Paired HTTPS| B[Mac host]
    B --> C[Apple Vision foreground mask]
    C --> D[Ollama vision model]
    D --> E[Validated JSON word entry]
    E --> F[Reviewable card on phone]
    F --> G[Local collection + Japanese TTS]
```

The model supplies bounded text fields and a category. It cannot supply HTML, scripts, arbitrary image URLs, or layouts. The host validates the response against a fixed contract; the app renders the card. Generated facts and labels can still be wrong. Background removal is not evidence that the classification is correct.

Photos are resized and re-encoded before upload. Temporary processing files on the Mac are deleted after each scan. Saved cards contain the cutout and vocabulary data in the app's local IndexedDB. There is no account, collection sync, or telemetry in SpiralDex. See [privacy and storage](PRIVACY.md).

## Run from source

```sh
git clone https://github.com/edtireli/spiraldex.git
cd spiraldex
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
clang -O2 -mmacosx-version-min=14.0 \
  -framework Foundation -framework Vision -framework CoreImage \
  -framework CoreVideo -framework CoreGraphics host/segment.m -o host/segment
python host/server.py
```

Open **http://127.0.0.1:8137** for the app on your Mac. Building the subject extractor from source requires Xcode Command Line Tools. For the phone host, run `./"Start SpiralDex.command"` instead.

The public demo is entirely static:

```sh
python3 -m http.server 8142 --bind 127.0.0.1 --directory docs
```

Open **http://127.0.0.1:8142**. It works without Ollama or the Mac segmentation helper.

| Folder | Purpose |
| --- | --- |
| `web/` | Canonical HTML, CSS, JavaScript, kana, and sample images |
| `android/` | Native camera, TTS, encrypted pairing storage, and pinned HTTPS bridge |
| `host/` | Python API, pairing setup, and Apple Vision helper |
| `docs/` | Static project page, sample-only app, and media |
| `scripts/` | Asset sync, local release build, screenshots, and Terminal publishing |
| `tests/` | API contract, browser, and public demo checks |

## Configuration

| Setting | Default | Purpose |
| --- | --- | --- |
| `DEX_VISION_MODEL` | `gemma3:12b` | Installed Ollama vision model |
| `SPIRALDEX_IDENTITY` | `~/.spiraldex` | Private token and certificate directory |
| `SPIRALCHAT_GATEWAY_DIR` | Unset | Optional reuse of a Spiral Chat identity |
| `SPIRALDEX_DICTIONARY` | Unset | Optional local JSON mapping words to `[reading, ...]` for an exact reading match |
| `--port` | `8137` / `8445` | Browser preview / HTTPS phone host port |

The optional dictionary is not bundled. A reading match checks only that spelling/reading pair, not the model's identification or generated prose. Model weights and third-party dictionaries keep their own licenses.

## Current limits

- The host currently requires macOS 14+; there is no Windows/Linux segmentation backend.
- Object recognition and readings need review. You can correct a generated word before saving it.
- Basic kana only; voiced, semi-voiced, and combined sounds are planned.
- Recall is a simple self-check, not a spaced-repetition system or proficiency score.
- Saved cards work offline. New scans need the Mac. There is no durable offline photo queue or cross-device sync.
- Cancelling stops waiting on the phone; a running model job can finish on the Mac.
- TTS needs an installed Japanese voice. The app's voice settings shortcut helps when one is missing.
- A generated pairing certificate lasts one year. Renewing it requires re-pairing the app.

## Development and releases

See [CONTRIBUTING.md](CONTRIBUTING.md) for browser tests, Android builds, signing, and local packaging. Release artifacts are built locally and uploaded directly; this repository contains no paid CI build workflow. GitHub Pages serves the prebuilt `docs/` directory using its normal Pages deployment.

See [TESTING.md](TESTING.md) for this release's verification and limits, [CHANGELOG.md](CHANGELOG.md) for changes, and [CREDITS.md](CREDITS.md) for assets and inspiration.

SpiralDex is an independent learning project inspired by classic handheld field guides. It is not affiliated with Pokémon, Nintendo, or The Pokémon Company. The UI and card effects are original code; no Pokémon artwork is bundled.
