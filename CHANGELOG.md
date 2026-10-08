# Changelog

## 0.3.2 — 2026-10-08

- Accept HTTPS pairing addresses with a gateway path, including `https://edspiral.duckdns.org:8443/spiraldex`, and normalize an optional trailing slash.
- Preserve the prefix for health, scan, and scan-status requests; direct Mac addresses continue to work.
- Show separate validation errors for address, token, and certificate fingerprint. Distinguish a non-JSON missing gateway route from an unreachable Mac.
- Retain certificate pinning, encrypted token storage, disabled redirects, and the fixed API allowlist.
- Add Java URL regression checks and an Android emulator test using a temporary HTTPS endpoint. Shared-port gateway configuration is separate from this client update.

## 0.3.1 — 2026-10-08

- Scale each complete card face from a fixed print layout so Android's minimum font size cannot distort archive thumbnails; contain long text and reset inherited image/layout rules.
- Enlarge a lone archive card, add readable Japanese/English captions, and use two/four cards per page according to available height.
- Let either first swipe advance from the left dot to the middle dot, continue to the last dot in the same direction, and reverse to go back.
- Retain the upstream foil layers, phone orientation, pronunciation, and model rarity; add long-entry layout and gesture regression coverage.

## 0.3.0 — 2026-10-08

- Integrate verbatim, pinned pokemon-cards-css base, reverse-holo, regular-holo, and gallery-holo styles with touch and pointer lighting.
- Add smoothed phone orientation for card tilt, subtle movement, and foil lighting; native Android sensors, browser permission flow, recenter/off controls, reduced motion, and background suspension.
- Rebuild card faces with trading-card proportions, gold/silver frames, illustration panels, ability/attack typography, and printed stat strips; use the same faces in the archive.
- Let the model assess object rarity and provide its reason and finish; remove hash-generated rarity. Common/uncommon stays non-holo, rare gets holo/reverse holo, ultra rare gets full-art holo.
- Preserve new rarity assessments across saving/reload. Older entries show Unassessed until rescanned.
- Add a four-finish comparison page, upstream attribution/license, hash verification, and corresponding-source release ZIP.
- Distribute the integrated app under GPL-3.0, preserving previous MIT notices.

## 0.2.0 — 2026-10-08

- Camera-first Classic Dex, without starter objects, a scrolling home feed, or bottom navigation.
- Rightward swipes cycle Scanner → Card archive → Kana library; D-pad and keyboard equivalents.
- Automatic capture-to-scan flow with live contour-tracing and Dex consultation stages.
- Completed card unlocks with automatically selected type, rarity, finish, HP, and three field ratings.
- Automatic local registration, inspection, pronunciation, correction, and storage-failure recovery.
- Real v0.1 discoveries and pairing retained; bundled starter entries removed from the device collection.
- Hiragana fields constrained during generation as well as validated afterward.
- Updated signed Android app, Mac companion, public demo, screenshots, and walkthrough.

## 0.1.0 — 2026-10-08

First independent SpiralDex preview.

- Classic Dex interface with a native Android camera/photo picker and Japanese TTS.
- Paired Mac HTTPS host, Apple Vision foreground extraction, and Ollama word-card generation.
- Fixed, validated vocabulary templates with editable labels, classic/foil finishes, and local collections.
- Basic hiragana/katakana library and recall practice.
- New photographic chair, apple, and cup sample cutouts.
- Public sample demo, five design studies, fresh screenshots, and walkthrough recording.
- Signed Android release, universal Mac helper, portable host ZIP, static demo ZIP, and checksums.

This is an early preview. See the README for requirements and current limits.
