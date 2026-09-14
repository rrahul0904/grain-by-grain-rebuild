import {
  TOTAL_GRAINS,
  buildGrainSpecs,
  clamp,
  formatTime,
  seedFromString,
  sortingZoneFor,
} from "./core.js";

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d", { alpha: false });
const shell = document.querySelector("#game-shell");
const statusEl = document.querySelector("#status");
const blackCountEl = document.querySelector("#black-count");
const goldCountEl = document.querySelector("#gold-count");
const timerEl = document.querySelector("#timer");
const bestEl = document.querySelector("#best-time");
const seedEl = document.querySelector("#seed-label");
const pauseDialog = document.querySelector("#pause-dialog");
const restartDialog = document.querySelector("#restart-dialog");
const completeDialog = document.querySelector("#complete-dialog");
const completeTimeEl = document.querySelector("#complete-time");
const soundButton = document.querySelector("#sound-toggle");
const pauseButton = document.querySelector("#pause-button");
const restartButton = document.querySelector("#restart-button");
const toast = document.querySelector("#toast");

const TAU = Math.PI * 2;
const state = {
  grains: [],
  sorted: { black: 0, gold: 0 },
  startedAt: null,
  pausedAt: null,
  pauseTotal: 0,
  completeAt: null,
  paused: false,
  sound: localStorage.getItem("gbg-sound") !== "off",
  seed: 0,
  width: 0,
  height: 0,
  dpr: 1,
  raf: 0,
  lastFrame: performance.now(),
  pointerOwners: new Map(),
};

const sticks = {
  left: makeStick("left", "gold", 1),
  right: makeStick("right", "black", -1),
};

function makeStick(id, preferredType, flickDirection) {
  return {
    id,
    preferredType,
    flickDirection,
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    vx: 0,
    vy: 0,
    gripping: false,
    attachedId: null,
    pointerId: null,
  };
}

function world() {
  const margin = clamp(state.width * 0.035, 18, 42);
  const top = clamp(state.height * 0.13, 72, 108);
  const bottom = state.height - clamp(state.height * 0.13, 70, 104);
  const left = margin;
  const right = state.width - margin;
  const zoneWidth = clamp((right - left) * 0.18, 90, 190);
  return { left, right, top, bottom, zoneWidth };
}

function seedFromLocation() {
  const params = new URLSearchParams(location.search);
  const raw = params.get("seed") || new Date().toISOString().slice(0, 10);
  return { raw, seed: seedFromString(raw) };
}

function resetGame(seedInfo = seedFromLocation()) {
  const { left, right, top, bottom, zoneWidth } = world();
  state.seed = seedInfo.seed;
  state.sorted.black = 0;
  state.sorted.gold = 0;
  state.startedAt = performance.now();
  state.pauseTotal = 0;
  state.pausedAt = null;
  state.completeAt = null;
  state.paused = false;
  state.pointerOwners.clear();

  const pileLeft = left + zoneWidth + 24;
  const pileRight = right - zoneWidth - 24;
  const pileTop = top + 36;
  const pileBottom = bottom - 36;
  const specs = buildGrainSpecs(state.seed);

  state.grains = specs.map((spec) => {
    const centerBiasX = 0.5 + (spec.xJitter - 0.5) * 0.7;
    const centerBiasY = 0.5 + (spec.yJitter - 0.5) * 0.78;
    return {
      ...spec,
      x: pileLeft + (pileRight - pileLeft) * centerBiasX,
      y: pileTop + (pileBottom - pileTop) * centerBiasY,
      vx: (spec.xJitter - 0.5) * 12,
      vy: (spec.yJitter - 0.5) * 12,
      angle: spec.angle,
      omega: spec.spin,
      w: 9 + spec.sizeJitter * 5,
      h: 3.6 + spec.sizeJitter * 1.8,
      sorted: false,
      sortIndex: -1,
    };
  });

  resetStickPositions();
  closeDialog(pauseDialog);
  closeDialog(restartDialog);
  closeDialog(completeDialog);
  updateHud();
  seedEl.textContent = seedInfo.raw;
}

function resetStickPositions() {
  const { left, right, top, bottom } = world();
  const y = bottom - (bottom - top) * 0.18;
  const leftX = left + (right - left) * 0.38;
  const rightX = left + (right - left) * 0.62;
  for (const [side, x] of [["left", leftX], ["right", rightX]]) {
    Object.assign(sticks[side], {
      x, y, targetX: x, targetY: y, vx: 0, vy: 0,
      gripping: false, attachedId: null, pointerId: null,
    });
  }
}

function resize() {
  const rect = shell.getBoundingClientRect();
  const previous = { width: state.width || rect.width, height: state.height || rect.height };
  state.width = Math.max(320, rect.width);
  state.height = Math.max(460, rect.height);
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(state.width * state.dpr);
  canvas.height = Math.round(state.height * state.dpr);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

  if (state.grains.length) {
    const sx = state.width / previous.width;
    const sy = state.height / previous.height;
    for (const grain of state.grains) {
      grain.x *= sx;
      grain.y *= sy;
    }
    for (const stick of Object.values(sticks)) {
      stick.x *= sx; stick.targetX *= sx;
      stick.y *= sy; stick.targetY *= sy;
    }
  }
}

function elapsedMs(now = performance.now()) {
  if (!state.startedAt) return 0;
  const endpoint = state.completeAt ?? (state.pausedAt ?? now);
  return Math.max(0, endpoint - state.startedAt - state.pauseTotal);
}

function updateHud() {
  const total = state.sorted.black + state.sorted.gold;
  statusEl.textContent = `${total} / ${TOTAL_GRAINS} grains sorted`;
  blackCountEl.textContent = `${state.sorted.black} / 90`;
  goldCountEl.textContent = `${state.sorted.gold} / 90`;
  const current = elapsedMs();
  timerEl.textContent = formatTime(current);
  const best = Number(localStorage.getItem("gbg-best") || 0);
  bestEl.textContent = best ? `best ${formatTime(best)}` : "best —";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("visible"), 1800);
}

function audioPing(frequency = 420, duration = 0.035, volume = 0.025) {
  if (!state.sound) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  if (!audioPing.context) audioPing.context = new AudioContext();
  const ac = audioPing.context;
  if (ac.state === "suspended") ac.resume();
  const oscillator = ac.createOscillator();
  const gain = ac.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  oscillator.connect(gain).connect(ac.destination);
  oscillator.start();
  oscillator.stop(ac.currentTime + duration);
}

function acquireNearby(stick) {
  let best = null;
  let bestDistance = 34;
  for (const grain of state.grains) {
    if (grain.sorted) continue;
    const dx = grain.x - stick.x;
    const dy = grain.y - stick.y;
    const distance = Math.hypot(dx, dy);
    const typeBonus = grain.type === stick.preferredType ? 8 : 0;
    if (distance - typeBonus < bestDistance) {
      best = grain;
      bestDistance = distance - typeBonus;
    }
  }
  stick.attachedId = best?.id ?? null;
  if (best) audioPing(best.type === "gold" ? 560 : 330, 0.028, 0.018);
}

function releaseStick(stick, strong = false) {
  if (!stick.gripping && !stick.attachedId) return;
  const grain = state.grains.find((candidate) => candidate.id === stick.attachedId);
  if (grain && !grain.sorted) {
    const directional = strong ? 340 : 220;
    grain.vx += stick.vx * 12 + stick.flickDirection * directional;
    grain.vy += stick.vy * 10 - (strong ? 30 : 10);
    grain.omega += stick.flickDirection * 0.06 + stick.vx * 0.003;
    audioPing(grain.type === "gold" ? 680 : 280, 0.045, 0.03);
    navigator.vibrate?.(10);
  }
  stick.gripping = false;
  stick.attachedId = null;
}

function setGrip(stick, active) {
  if (active && !stick.gripping) {
    stick.gripping = true;
    acquireNearby(stick);
  } else if (!active && stick.gripping) {
    releaseStick(stick, false);
  }
}

const keys = new Set();
window.addEventListener("keydown", (event) => {
  if (["Space", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
    event.preventDefault();
  }
  keys.add(event.code);
  if (event.code === "Space" && !event.repeat) setGrip(sticks.left, true);
  if (event.code === "Enter" && !event.repeat) setGrip(sticks.right, true);
  if (event.code === "Escape" && !event.repeat) togglePause();
  if (event.code === "KeyR" && (event.metaKey || event.ctrlKey) === false && !event.repeat) requestRestart();
});
window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
  if (event.code === "Space") releaseStick(sticks.left, true);
  if (event.code === "Enter") releaseStick(sticks.right, true);
});

function updateKeyboard(dt) {
  const speed = 285;
  const amount = speed * dt;
  if (keys.has("KeyW")) sticks.left.targetY -= amount;
  if (keys.has("KeyS")) sticks.left.targetY += amount;
  if (keys.has("KeyA")) sticks.left.targetX -= amount;
  if (keys.has("KeyD")) sticks.left.targetX += amount;
  if (keys.has("ArrowUp")) sticks.right.targetY -= amount;
  if (keys.has("ArrowDown")) sticks.right.targetY += amount;
  if (keys.has("ArrowLeft")) sticks.right.targetX -= amount;
  if (keys.has("ArrowRight")) sticks.right.targetX += amount;
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

canvas.addEventListener("pointerdown", (event) => {
  if (state.paused || state.completeAt) return;
  const point = pointerPosition(event);
  let chosen = null;
  let bestDistance = 90;
  for (const stick of Object.values(sticks)) {
    if (stick.pointerId !== null) continue;
    const distance = Math.hypot(point.x - stick.x, point.y - stick.y);
    if (distance < bestDistance) {
      chosen = stick;
      bestDistance = distance;
    }
  }
  if (!chosen) chosen = point.x < state.width / 2 ? sticks.left : sticks.right;
  chosen.pointerId = event.pointerId;
  chosen.targetX = point.x;
  chosen.targetY = point.y;
  state.pointerOwners.set(event.pointerId, chosen.id);
  canvas.setPointerCapture(event.pointerId);
  setGrip(chosen, true);
});

canvas.addEventListener("pointermove", (event) => {
  const side = state.pointerOwners.get(event.pointerId);
  if (!side) return;
  const point = pointerPosition(event);
  sticks[side].targetX = point.x;
  sticks[side].targetY = point.y;
});

function endPointer(event) {
  const side = state.pointerOwners.get(event.pointerId);
  if (!side) return;
  const stick = sticks[side];
  releaseStick(stick, true);
  stick.pointerId = null;
  state.pointerOwners.delete(event.pointerId);
  try { canvas.releasePointerCapture(event.pointerId); } catch {}
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);

function updateSticks(dt) {
  const bounds = world();
  for (const stick of Object.values(sticks)) {
    stick.targetX = clamp(stick.targetX, bounds.left + 20, bounds.right - 20);
    stick.targetY = clamp(stick.targetY, bounds.top + 18, bounds.bottom - 18);
    const oldX = stick.x;
    const oldY = stick.y;
    const responsiveness = 1 - Math.pow(0.0008, dt);
    stick.x += (stick.targetX - stick.x) * responsiveness;
    stick.y += (stick.targetY - stick.y) * responsiveness;
    stick.vx = (stick.x - oldX) / Math.max(dt, 0.001);
    stick.vy = (stick.y - oldY) / Math.max(dt, 0.001);

    if (stick.gripping) {
      if (!stick.attachedId) acquireNearby(stick);
      const grain = state.grains.find((candidate) => candidate.id === stick.attachedId);
      if (grain && !grain.sorted) {
        grain.vx += (stick.x - grain.x) * 24 * dt;
        grain.vy += (stick.y - grain.y) * 24 * dt;
        grain.vx *= 0.94;
        grain.vy *= 0.94;
      }
    }
  }
}

function updateGrains(dt) {
  const bounds = world();
  const friction = Math.pow(0.82, dt * 60);

  for (const grain of state.grains) {
    if (grain.sorted) {
      const target = sortedTarget(grain);
      grain.vx += (target.x - grain.x) * 10 * dt;
      grain.vy += (target.y - grain.y) * 10 * dt;
      grain.vx *= 0.84;
      grain.vy *= 0.84;
      grain.x += grain.vx * dt;
      grain.y += grain.vy * dt;
      grain.angle += grain.omega;
      grain.omega *= 0.9;
      continue;
    }

    grain.x += grain.vx * dt;
    grain.y += grain.vy * dt;
    grain.angle += grain.omega * dt * 60;
    grain.vx *= friction;
    grain.vy *= friction;
    grain.omega *= 0.985;

    const radius = grain.w * 0.6;
    if (grain.x < bounds.left + radius) {
      grain.x = bounds.left + radius;
      grain.vx = Math.abs(grain.vx) * 0.72;
    } else if (grain.x > bounds.right - radius) {
      grain.x = bounds.right - radius;
      grain.vx = -Math.abs(grain.vx) * 0.72;
    }
    if (grain.y < bounds.top + radius) {
      grain.y = bounds.top + radius;
      grain.vy = Math.abs(grain.vy) * 0.72;
    } else if (grain.y > bounds.bottom - radius) {
      grain.y = bounds.bottom - radius;
      grain.vy = -Math.abs(grain.vy) * 0.72;
    }
  }

  resolveGrainCollisions();
  detectSorting(bounds);
}

function resolveGrainCollisions() {
  // Uniform-ish pile size makes a simple O(n²) pass acceptable for 180 bodies.
  // The collision model intentionally prioritizes tactile response over rigid-body accuracy.
  const grains = state.grains;
  for (let i = 0; i < grains.length; i += 1) {
    const a = grains[i];
    if (a.sorted) continue;
    for (let j = i + 1; j < grains.length; j += 1) {
      const b = grains[j];
      if (b.sorted) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const minDistance = (a.w + b.w) * 0.33;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq <= 0 || distanceSq >= minDistance * minDistance) continue;
      const distance = Math.sqrt(distanceSq);
      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = minDistance - distance;
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;
      const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (relative < 0) {
        const impulse = -relative * 0.34;
        a.vx -= nx * impulse;
        a.vy -= ny * impulse;
        b.vx += nx * impulse;
        b.vy += ny * impulse;
      }
    }
  }
}

function detectSorting(bounds) {
  for (const grain of state.grains) {
    if (grain.sorted) continue;
    const zone = sortingZoneFor(grain.x, bounds.left, bounds.right, bounds.zoneWidth);
    if (!zone || zone !== grain.type) continue;
    grain.sorted = true;
    grain.sortIndex = state.sorted[grain.type];
    state.sorted[grain.type] += 1;
    grain.vx *= 0.25;
    grain.vy *= 0.25;
    grain.omega *= 0.2;
    audioPing(grain.type === "gold" ? 720 : 360, 0.05, 0.022);
    navigator.vibrate?.(6);
    updateHud();
    if (state.sorted.black + state.sorted.gold === TOTAL_GRAINS) finishGame();
  }
}

function sortedTarget(grain) {
  const bounds = world();
  const zoneCenterX = grain.type === "black"
    ? bounds.left + bounds.zoneWidth * 0.5
    : bounds.right - bounds.zoneWidth * 0.5;
  const columns = Math.max(6, Math.floor(bounds.zoneWidth / 14));
  const col = grain.sortIndex % columns;
  const row = Math.floor(grain.sortIndex / columns);
  const spread = Math.min(bounds.zoneWidth - 34, columns * 12);
  const x = zoneCenterX - spread / 2 + col * (spread / Math.max(columns - 1, 1));
  const y = bounds.bottom - 22 - row * 8;
  return { x, y };
}

function finishGame() {
  state.completeAt = performance.now();
  const result = elapsedMs(state.completeAt);
  const best = Number(localStorage.getItem("gbg-best") || 0);
  if (!best || result < best) localStorage.setItem("gbg-best", String(Math.round(result)));
  completeTimeEl.textContent = formatTime(result);
  openDialog(completeDialog);
  updateHud();
  audioPing(880, 0.18, 0.04);
}

function openDialog(dialog) {
  if (!dialog.open) dialog.showModal();
}
function closeDialog(dialog) {
  if (dialog.open) dialog.close();
}

function pauseGame(auto = false) {
  if (state.paused || state.completeAt) return;
  state.paused = true;
  state.pausedAt = performance.now();
  openDialog(pauseDialog);
  pauseDialog.dataset.auto = auto ? "true" : "false";
  updateHud();
}

function resumeGame() {
  if (!state.paused) return;
  state.pauseTotal += performance.now() - state.pausedAt;
  state.pausedAt = null;
  state.paused = false;
  closeDialog(pauseDialog);
  state.lastFrame = performance.now();
}

function togglePause() {
  if (state.paused) resumeGame(); else pauseGame(false);
}

function requestRestart() {
  if (state.completeAt) return resetGame();
  pauseGame(false);
  openDialog(restartDialog);
}

pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", requestRestart);
document.querySelectorAll("[data-resume]").forEach((button) => button.addEventListener("click", () => {
  closeDialog(restartDialog);
  resumeGame();
}));
document.querySelector("[data-confirm-restart]").addEventListener("click", () => resetGame());
document.querySelector("[data-replay]").addEventListener("click", () => resetGame());

soundButton.addEventListener("click", () => {
  state.sound = !state.sound;
  localStorage.setItem("gbg-sound", state.sound ? "on" : "off");
  soundButton.setAttribute("aria-pressed", String(state.sound));
  soundButton.textContent = state.sound ? "Sound on" : "Sound off";
  if (state.sound) audioPing(520, 0.05, 0.025);
});
soundButton.setAttribute("aria-pressed", String(state.sound));
soundButton.textContent = state.sound ? "Sound on" : "Sound off";

document.querySelector("[data-share]").addEventListener("click", async () => {
  const text = `I sorted all 180 grains in ${formatTime(elapsedMs())} — a little order, one grain at a time.`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Grain By Grain", text, url: location.href });
    } else {
      await navigator.clipboard.writeText(`${text} ${location.href}`);
      showToast("Result copied");
    }
  } catch (error) {
    if (error?.name !== "AbortError") showToast("Share wasn’t available");
  }
});

document.querySelector("#copy-seed").addEventListener("click", async () => {
  const url = new URL(location.href);
  url.searchParams.set("seed", seedEl.textContent);
  try {
    await navigator.clipboard.writeText(url.href);
    showToast("Challenge link copied");
  } catch {
    showToast("Copy unavailable");
  }
});

window.addEventListener("blur", () => {
  if (!state.completeAt && !state.paused && !document.hidden) pauseGame(true);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && !state.paused && !state.completeAt) pauseGame(true);
});

function render() {
  const bounds = world();
  ctx.fillStyle = "#f1ede3";
  ctx.fillRect(0, 0, state.width, state.height);

  // subtle paper grain
  ctx.globalAlpha = 0.055;
  ctx.fillStyle = "#6c6257";
  for (let i = 0; i < 70; i += 1) {
    const x = (i * 97.31) % state.width;
    const y = (i * 43.77) % state.height;
    ctx.fillRect(x, y, 0.7, 0.7);
  }
  ctx.globalAlpha = 1;

  drawWorld(bounds);
  for (const grain of state.grains) drawGrain(grain);
  drawStick(sticks.left);
  drawStick(sticks.right);
}

function drawWorld(bounds) {
  ctx.save();
  ctx.strokeStyle = "rgba(56, 49, 43, .22)";
  ctx.lineWidth = 1;
  roundedRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top, 20);
  ctx.stroke();

  ctx.fillStyle = "rgba(32, 29, 26, .035)";
  roundedRect(bounds.left + 8, bounds.top + 8, bounds.zoneWidth - 8, bounds.bottom - bounds.top - 16, 14);
  ctx.fill();
  ctx.fillStyle = "rgba(184, 138, 54, .075)";
  roundedRect(bounds.right - bounds.zoneWidth, bounds.top + 8, bounds.zoneWidth - 8, bounds.bottom - bounds.top - 16, 14);
  ctx.fill();

  ctx.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.letterSpacing = "0.14em";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(48, 43, 38, .42)";
  ctx.fillText("BLACK", bounds.left + bounds.zoneWidth / 2, bounds.top + 26);
  ctx.fillStyle = "rgba(145, 98, 30, .62)";
  ctx.fillText("GOLDEN", bounds.right - bounds.zoneWidth / 2, bounds.top + 26);
  ctx.restore();
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawGrain(grain) {
  ctx.save();
  ctx.translate(grain.x, grain.y);
  ctx.rotate(grain.angle);
  ctx.shadowBlur = grain.sorted ? 2 : 4;
  ctx.shadowOffsetY = 1.5;
  ctx.shadowColor = "rgba(30, 25, 20, .18)";
  ctx.fillStyle = grain.type === "gold" ? "#caa654" : "#292725";
  ctx.beginPath();
  ctx.ellipse(0, 0, grain.w / 2, grain.h / 2, 0, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = grain.type === "gold" ? "rgba(255,248,218,.45)" : "rgba(255,255,255,.08)";
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(-grain.w * 0.27, -grain.h * 0.12);
  ctx.quadraticCurveTo(0, -grain.h * 0.42, grain.w * 0.28, -grain.h * 0.08);
  ctx.stroke();
  ctx.restore();
}

function drawStick(stick) {
  const isLeft = stick.id === "left";
  const shaftLength = clamp(state.height * 0.26, 120, 210);
  const angle = isLeft ? -0.38 : 0.38;
  const tailX = stick.x + Math.sin(angle) * shaftLength;
  const tailY = stick.y + Math.cos(angle) * shaftLength;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = 9;
  ctx.strokeStyle = "rgba(103, 73, 43, .18)";
  ctx.beginPath();
  ctx.moveTo(stick.x + 2, stick.y + 3);
  ctx.lineTo(tailX + 4, tailY + 5);
  ctx.stroke();
  ctx.lineWidth = 6.5;
  const gradient = ctx.createLinearGradient(stick.x, stick.y, tailX, tailY);
  gradient.addColorStop(0, "#9a6f40");
  gradient.addColorStop(0.58, "#b88b54");
  gradient.addColorStop(1, "#765131");
  ctx.strokeStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(stick.x, stick.y);
  ctx.lineTo(tailX, tailY);
  ctx.stroke();
  ctx.fillStyle = stick.gripping ? "#43382e" : "#765b3e";
  ctx.beginPath();
  ctx.arc(stick.x, stick.y, stick.gripping ? 5.5 : 4.2, 0, TAU);
  ctx.fill();
  if (stick.gripping) {
    ctx.strokeStyle = "rgba(67,56,46,.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(stick.x, stick.y, 15, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function frame(now) {
  const dt = Math.min((now - state.lastFrame) / 1000, 1 / 20);
  state.lastFrame = now;
  if (!state.paused && !state.completeAt) {
    updateKeyboard(dt);
    updateSticks(dt);
    updateGrains(dt);
    updateHud();
  }
  render();
  state.raf = requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
resize();
resetGame();
state.lastFrame = performance.now();
state.raf = requestAnimationFrame(frame);
