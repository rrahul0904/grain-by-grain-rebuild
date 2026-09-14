import test from "node:test";
import assert from "node:assert/strict";
import {
  TOTAL_GRAINS,
  bestStorageKey,
  buildGrainSpecs,
  challengeUrl,
  formatTime,
  localDateSeed,
  randomSeedLabel,
  seedFromString,
  sortingZoneFor,
} from "../src/core.js";

test("creates exactly 180 grains split evenly by type", () => {
  const grains = buildGrainSpecs(42);
  assert.equal(grains.length, TOTAL_GRAINS);
  assert.equal(grains.filter((g) => g.type === "black").length, 90);
  assert.equal(grains.filter((g) => g.type === "gold").length, 90);
});

test("seeded piles are deterministic", () => {
  assert.deepEqual(buildGrainSpecs(123), buildGrainSpecs(123));
  assert.notDeepEqual(buildGrainSpecs(123), buildGrainSpecs(124));
  assert.equal(seedFromString("2026-09-14"), seedFromString("2026-09-14"));
});

test("daily seed follows the local calendar date", () => {
  assert.equal(localDateSeed(new Date(2026, 8, 14, 23, 59, 59)), "2026-09-14");
  assert.equal(localDateSeed(new Date(2026, 8, 15, 0, 0, 1)), "2026-09-15");
});

test("personal best storage is isolated by challenge seed", () => {
  assert.equal(bestStorageKey("2026-09-14"), "gbg-best:v2:2026-09-14");
  assert.notEqual(bestStorageKey("2026-09-14"), bestStorageKey("2026-09-15"));
  assert.equal(bestStorageKey("a pile / with spaces"), "gbg-best:v2:a%20pile%20%2F%20with%20spaces");
});

test("challenge links always pin the active seed", () => {
  assert.equal(
    challengeUrl("https://example.com/play?from=share#game", "pile 42"),
    "https://example.com/play?from=share&seed=pile+42",
  );
});

test("random seed labels are stable for supplied entropy", () => {
  assert.equal(randomSeedLabel(42), randomSeedLabel(42));
  assert.notEqual(randomSeedLabel(42), randomSeedLabel(43));
  assert.match(randomSeedLabel(42), /^pile-[0-9a-z]{7}$/);
});

test("sorting zones classify only the two edge trays", () => {
  assert.equal(sortingZoneFor(110, 100, 900, 140), "black");
  assert.equal(sortingZoneFor(500, 100, 900, 140), null);
  assert.equal(sortingZoneFor(800, 100, 900, 140), "gold");
});

test("timer formatting is stable", () => {
  assert.equal(formatTime(0), "00:00");
  assert.equal(formatTime(61_999), "01:01");
  assert.equal(formatTime(3_605_000), "60:05");
});
