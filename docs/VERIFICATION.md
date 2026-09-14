# Verification

Run:

```bash
npm run verify
npm run serve
```

Then open `http://127.0.0.1:4173`.

Browser smoke verification should cover:

- 180 grains render on initial load.
- HUD starts at 0/180, 0/90 black, 0/90 gold.
- WASD moves the left chopstick.
- Arrow keys move the right chopstick.
- Space hold/release and Enter hold/release fling nearby grains toward their intended tray.
- Pointer/touch drag acquires and releases a stick.
- Pause freezes timer and simulation.
- Restart confirmation does not silently destroy a pile.
- Completion saves personal best and offers share/new pile.
- `?seed=foo` gives a deterministic pile.
