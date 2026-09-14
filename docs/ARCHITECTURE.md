# Architecture

This is a clean-room recreation based only on publicly observable behavior. It does not contain source code, private assets, or copied implementation details from the reference site.

## Runtime

The app intentionally has zero runtime dependencies. The browser owns the complete game loop:

1. `requestAnimationFrame` drives a fixed-clamped simulation step.
2. 180 ellipse-like particle bodies represent the grains.
3. Two kinematic chopsticks follow keyboard or pointer targets.
4. Holding a stick acquires a nearby grain; releasing applies an impulse.
5. Correct-color edge trays convert grains into settled/sorted bodies.
6. HUD state, timer, pause, restart, completion, personal best, seed links, share, audio synthesis and haptics all remain local.

## Why custom physics

The first implementation avoids Matter.js/PixiJS so the project can run and certify in an environment with no package-registry access. For only 180 bodies, an O(n²) collision pass is still small enough in modern browsers, while the absence of dependencies eliminates a whole class of supply-chain and build blockers.

## State boundaries

- Canvas owns per-frame simulation and rendering.
- DOM owns menus, HUD, dialogs and accessibility.
- `localStorage` persists best time and sound preference.
- URL `?seed=` provides deterministic challenge piles.

## Deliberate differences

The implementation recreates the interaction concept, not the original product's proprietary source, visual assets, branding implementation, or undisclosed physics constants.
