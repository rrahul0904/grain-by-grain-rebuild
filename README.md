# Grain By Grain — clean-room rebuild

A dependency-free recreation of the tactile sorting concept at `grainbygrain.sotak.com`: 180 grains, two chopsticks, two sorting trays, keyboard + pointer controls, Zen timer, pause/restart/share flows, deterministic challenge seeds, synthesized micro-audio, haptics, and per-challenge personal-best persistence.

> **Clean-room note:** This repository is an independent implementation based on publicly observable behavior. No source code or private assets from the reference product are included.

## Run locally

```bash
npm run verify
npm run serve
```

Open `http://127.0.0.1:4173`.

## Controls

- Left chopstick: `W A S D`, hold/release `Space` to flick right.
- Right chopstick: arrow keys, hold/release `Enter` to flick left.
- Mouse/touch/pen: drag a chopstick tip; hold then release to flick.
- `Esc`: pause.
- `R`: restart confirmation.

## Challenge behavior

- The default pile is keyed to the player's **local calendar date**.
- `?seed=<value>` reproduces the same 180-grain pile exactly.
- Personal-best times are stored **per seed**, so unrelated piles never share a record.
- Copy/share actions always pin the active seed into the URL.
- **Restart** replays the active pile.
- **New pile** creates a fresh deterministic seed and writes it into the address bar so refresh keeps the same pile.

## Architecture

- HTML/CSS + Canvas 2D.
- Custom lightweight particle collision model (no runtime dependencies).
- Web Audio oscillator micro-sounds; no media assets required.
- Local storage for per-seed best times and the sound setting.
- URL seeds for reproducible piles and shareable challenges.
- Node's built-in test runner and syntax checks for CI.

See `docs/ARCHITECTURE.md`, `docs/VERIFICATION.md`, and `docs/PHASE2.md`.

## Deployment

The app is static and deploys cleanly to GitHub Pages, Vercel, Netlify, Cloudflare Pages, S3/CloudFront, or any basic HTTP server. No environment variables are required for the core game.
