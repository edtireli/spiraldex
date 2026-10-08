SpiralDex static demo — 0.2.0

From the extracted SpiralDex folder, run:

  python3 -m http.server 8142 --bind 127.0.0.1 --directory docs

Open http://127.0.0.1:8142 in a browser.

The site and sample app are prebuilt HTML/CSS/JavaScript. No npm build,
Ollama, account, or pairing credentials are needed. Opening HTML directly
with file:// may block loading the kana JSON; use the local server above.

The demo uses curated samples and does not upload photos or call models.
Japanese audio needs a device/browser Japanese voice.

Source, Android app, and Mac host:
https://github.com/edtireli/spiraldex
