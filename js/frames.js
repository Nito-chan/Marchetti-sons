// frames.js — preloader, ImageBitmap cache, canvas draw (spec sections 2 + 4 + 8).
import { TOTAL_FRAMES } from './config.js';

const pad4 = (n) => String(n).padStart(4, '0');
const clampF = (f) => Math.min(Math.max(f, 1), TOTAL_FRAMES);

export const isDesktopView = () => window.innerWidth > 820;

let canvas = null;
let ctx = null;
let dir = 'assets/frames/desktop';
let stride = 1;
const cache = new Map(); // frame number -> ImageBitmap
let streaming = false;
let lastKey = '';

export function frameURL(f) {
  return `${dir}/f_${pad4(f)}.webp`;
}

export function loadedCount() {
  return cache.size;
}

// Nearest loaded frame (spec: scroll past an unloaded frame -> draw nearest loaded).
function nearestLoaded(f) {
  const want = Math.round(clampF(f));
  if (cache.has(want)) return { id: want, bmp: cache.get(want) };
  for (let d = 1; d < TOTAL_FRAMES; d++) {
    const lo = want - d;
    const hi = want + d;
    if (lo >= 1 && cache.has(lo)) return { id: lo, bmp: cache.get(lo) };
    if (hi <= TOTAL_FRAMES && cache.has(hi)) return { id: hi, bmp: cache.get(hi) };
  }
  return null;
}

async function loadOne(f) {
  if (cache.has(f)) return;
  const res = await fetch(frameURL(f));
  if (!res.ok) throw new Error(`frame ${f}: ${res.status}`);
  const blob = await res.blob();
  cache.set(f, await createImageBitmap(blob));
}

async function loadRange(list, batchSize, onBatch) {
  for (let i = 0; i < list.length; i += batchSize) {
    await Promise.all(list.slice(i, i + batchSize).map(loadOne));
    if (onBatch) onBatch();
  }
}

function listedFrames(from, to) {
  const out = [];
  for (let f = from; f <= to; f += stride) out.push(f);
  return out;
}

// Size the canvas to viewport x dpr (capped at 2). Call on boot + resize.
export function sizeCanvas() {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    lastKey = '';
  }
}

function countFirstWindow() {
  let n = 0;
  cache.forEach((_, f) => { if (f <= 90) n++; });
  return n;
}

// Load frames 1-90 (progress), draw frame 1, resolve; then stream the rest
// in batches of 12 while the viewer reads the hero.
export async function preloadFrames(canvasEl, onProgress) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  dir = isDesktopView() ? 'assets/frames/desktop' : 'assets/frames/mobile';
  // Memory guard: low-memory desktop loads every second frame (spec section 2).
  if (isDesktopView() && 'deviceMemory' in navigator && navigator.deviceMemory < 4) {
    stride = 2;
  }

  sizeCanvas();

  const first = listedFrames(1, 90);
  await loadRange(first, 12, () => {
    if (onProgress) onProgress(countFirstWindow(), first.length);
  });
  if (onProgress) onProgress(first.length, first.length);

  draw(1, 0); // never a blank screen behind the intro

  if (!streaming) {
    streaming = true;
    loadRange(listedFrames(91, TOTAL_FRAMES), 12).catch((err) => {
      console.error('Frame streaming failed:', err);
    });
  }
}

// Blend draw (spec section 4). scale follows the playhead (step 4 drives it).
export function draw(playhead, vel, scale = 1) {
  if (!ctx || cache.size === 0) return;
  const f = clampF(playhead);
  const fast = Math.abs(vel) >= 24;

  let a;
  let b = null;
  let alpha = 0;
  if (fast) {
    a = nearestLoaded(f); // no blend at speed (avoids ghosting)
  } else {
    const lo = Math.floor(f);
    const hi = Math.ceil(f);
    a = nearestLoaded(lo);
    if (hi !== lo) {
      const cand = nearestLoaded(hi);
      if (cand && a && cand.id !== a.id) {
        b = cand;
        alpha = f - lo;
      }
    }
  }
  if (!a) return;

  const key = `${a.id}|${b ? b.id : 0}|${alpha.toFixed(3)}|${scale.toFixed(4)}`;
  if (key === lastKey) return; // skip unchanged draws
  lastKey = key;

  // Cover-fit anchored at 55% x (60% on mobile, spec section 8), 50% y.
  const ax = isDesktopView() ? 0.55 : 0.6;
  const cw = canvas.width;
  const ch = canvas.height;
  ctx.clearRect(0, 0, cw, ch);
  ctx.globalAlpha = 1;
  const s = Math.max(cw / a.bmp.width, ch / a.bmp.height) * scale;
  ctx.drawImage(a.bmp, cw * ax - a.bmp.width * s * ax, ch * 0.5 - a.bmp.height * s * 0.5, a.bmp.width * s, a.bmp.height * s);
  if (b && alpha > 0.001) {
    const s2 = Math.max(cw / b.bmp.width, ch / b.bmp.height) * scale;
    ctx.globalAlpha = Math.min(Math.max(alpha, 0), 1);
    ctx.drawImage(b.bmp, cw * ax - b.bmp.width * s2 * ax, ch * 0.5 - b.bmp.height * s2 * 0.5, b.bmp.width * s2, b.bmp.height * s2);
  }
  ctx.globalAlpha = 1;
}
