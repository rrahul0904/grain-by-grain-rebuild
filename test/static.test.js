import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("web app manifest is valid and scoped to this static app", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", root), "utf8"));
  assert.equal(manifest.name, "Grain By Grain");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.some((icon) => icon.src === "./icon.svg"));
});

test("offline shell contains every gameplay-critical asset", async () => {
  const worker = await readFile(new URL("sw.js", root), "utf8");
  for (const asset of [
    "./index.html",
    "./styles.css",
    "./src/core.js",
    "./src/game.js",
    "./src/pwa.js",
  ]) {
    assert.match(worker, new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
