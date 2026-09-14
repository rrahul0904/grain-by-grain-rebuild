# Verification

Run:

```bash
npm run verify
npm run serve
```

Then open `http://127.0.0.1:4173`.

`npm run verify` covers syntax checks plus deterministic unit/static-contract tests. The current suite validates:

- exactly 180 grains split 90/90,
- deterministic seeded piles,
- local-calendar daily seed rollover,
- per-seed personal-best isolation,
- canonical challenge URLs,
- deterministic random-seed labels for supplied entropy,
- sorting-zone classification,
- timer formatting,
- valid installable web-app manifest,
- gameplay-critical assets in the offline shell.

Browser smoke verification should cover:

- 180 grains render on initial load.
- HUD starts at 0/180, 0/90 black, 0/90 gold.
- WASD moves the left chopstick.
- Arrow keys move the right chopstick.
- Space hold/release and Enter hold/release fling nearby grains toward their intended tray.
- Pointer/touch drag acquires and releases a stick.
- Pause freezes timer and simulation.
- Restart confirmation does not silently destroy a pile and preserves the active seed.
- Completion saves the personal best for that seed only.
- Share/copy links contain the exact active `?seed=` value.
- **New pile** generates a fresh seed and updates the address bar.
- `?seed=foo` gives a deterministic pile across reloads.
- Service-worker registration is progressive enhancement: failure must never block gameplay.
- After one successful HTTPS load, the static app shell is available offline.
