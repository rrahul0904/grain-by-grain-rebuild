# Phase 2 — Challenge integrity and replay quality

This phase hardens deterministic challenge behavior before adding broader product surface.

## Goals

- Treat the active seed as a first-class challenge identity.
- Store personal bests per seed rather than globally.
- Ensure every shared result includes the exact challenge seed.
- Make **New pile** actually generate a new deterministic pile.
- Preserve **Restart** as a restart of the current pile.

## Acceptance criteria

1. The same seed always creates the same 180-grain ordering.
2. Personal-best records never leak between different seeds.
3. Shared/copied challenge links always include `?seed=<active-seed>`.
4. A new pile produces a different seed and updates the address bar so refresh keeps that pile.
5. Existing keyboard, pointer, pause, restart, audio, timer and sorting behavior remains intact.
