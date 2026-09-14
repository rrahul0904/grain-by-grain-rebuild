import test from "node:test";
import assert from "node:assert/strict";
import {
  TOTAL_GRAINS,
  buildGrainSpecs,
  formatTime,
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
