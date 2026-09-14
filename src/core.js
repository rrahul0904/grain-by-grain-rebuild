export const GRAIN_COUNT_PER_COLOR = 90;
export const TOTAL_GRAINS = GRAIN_COUNT_PER_COLOR * 2;

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function formatTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function localDateSeed(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function bestStorageKey(seedLabel) {
  const normalized = String(seedLabel ?? "").trim() || "default";
  return `gbg-best:v2:${encodeURIComponent(normalized)}`;
}

export function challengeUrl(href, seedLabel) {
  const url = new URL(href);
  url.searchParams.set("seed", String(seedLabel));
  url.hash = "";
  return url.href;
}

export function randomSeedLabel(entropy) {
  const numeric = Number.isFinite(entropy) ? Math.abs(Math.floor(entropy)) : Date.now();
  return `pile-${(numeric >>> 0).toString(36).padStart(7, "0")}`;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function sortingZoneFor(x, worldLeft, worldRight, zoneWidth) {
  if (x <= worldLeft + zoneWidth) return "black";
  if (x >= worldRight - zoneWidth) return "gold";
  return null;
}

export function buildGrainSpecs(seed = 1) {
  const random = mulberry32(seed);
  const specs = [];
  for (const type of ["black", "gold"]) {
    for (let i = 0; i < GRAIN_COUNT_PER_COLOR; i += 1) {
      specs.push({
        id: `${type}-${i}`,
        type,
        sizeJitter: random(),
        angle: random() * Math.PI * 2,
        xJitter: random(),
        yJitter: random(),
        spin: (random() - 0.5) * 0.02,
      });
    }
  }

  // Deterministic Fisher-Yates keeps black/gold mixed in the starting pile.
  for (let i = specs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [specs[i], specs[j]] = [specs[j], specs[i]];
  }
  return specs;
}
