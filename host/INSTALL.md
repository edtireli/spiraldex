# SpiralDex Mac companion — 0.3.2

This folder is the prebuilt local model host for the SpiralDex Android app.

1. Use macOS 14 or newer. Install Python 3.10+ from python.org and Ollama from ollama.com.
2. In Terminal, run `ollama pull gemma3:12b`. Keep Ollama running.
3. Open `Start SpiralDex.command` in the extracted SpiralDex folder. First use creates a Python environment and installs Pillow. The bundle includes a universal Apple Silicon / Intel segmentation helper; rebuilding it requires Xcode Command Line Tools.
4. Install the SpiralDex APK on Android 9+ and connect both devices to the same trusted network.
5. Tap the blue lens in the app, choose Pair with your Mac, and enter the Mac address, pairing token, and certificate fingerprint shown in Terminal.
6. Keep this window open and the Mac awake while scanning. Stop with Control-C.

macOS may ask you to approve an unsigned downloaded launcher using Open / Privacy & Security. This companion is not a notarized Mac app. Model weights are not bundled. A 24 GB or larger Mac is recommended for the default Gemma 3 12B configuration.

Your private pairing identity is stored in `~/.spiraldex`. Do not share its token or private key. Set `SPIRALCHAT_GATEWAY_DIR` before launch to reuse an existing Spiral Chat identity, or `SPIRALDEX_IDENTITY` to select a different private directory. A newly generated certificate expires after one year; renewing it requires re-pairing the phone.

Android v0.3.2 also accepts a gateway address with a path, such as `https://edspiral.duckdns.org:8443/spiraldex`. The gateway must already route that prefix to SpiralDex with authentication. This host bundle does not modify Spiral Chat's gateway or router settings; direct host connections still normally use port 8445.

To use the UI directly on the Mac, run `.venv/bin/python host/server.py` and open http://127.0.0.1:8137. This loopback-only mode requires no pairing token.

Recognition is experimental. Review each generated object label and reading before learning it. Saved cards stay on the device that saved them. There is no cloud sync or durable offline scan queue.

- Setup and source: https://github.com/edtireli/spiraldex
- Releases: https://github.com/edtireli/spiraldex/releases/tag/v0.3.2
- Sample demo: https://edtireli.github.io/spiraldex/

Read PRIVACY.md for storage details and CREDITS.md for dependencies and artwork. New scans use Apple Vision and a local Ollama model; they do not call a cloud inference API.
