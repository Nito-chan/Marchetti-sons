// fx.js — dust, smoke, streak blur, footage scale push, mouse parallax,
// chapter sweep, flash timeline + CTA reveal (spec sections 6-8).
// Sound cues + toggle live in cta.js.
import { isDesktopView } from './frames.js';

const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Mobile runs a 560vh pin; every scroll-vh constant below scales with it.
const VSCALE = (window.innerWidth <= 820 ? 560 : 730) / 730;

// Footage scale push (pure function of playhead, reversible):
// 1.00 -> 1.07 by f145, hold, -> 1.12 over 229-265, back to 1.04 by f300.
export function footageScale(f) {
  return (
    1 +
    0.07 * smooth(1, 145, f) +
    0.05 * smooth(229, 265, f) -
    0.08 * smooth(270, 300, f)
  );
}

const CHAPTERS = [1, 87, 162, 229, 300];
const BRASS_HI = '#e3c57e';
const V_COOL = 'radial-gradient(ellipse at center, transparent 55%, rgba(11, 9, 8, 0.78) 100%)';
const V_WARM = 'radial-gradient(ellipse at center, transparent 55%, rgba(25, 20, 13, 0.78) 100%)';
const FLASH_HEX = '#fff4d6';
const SWEEP_KEYS = [
  { transform: 'scaleX(0)', opacity: '1' },
  { transform: 'scaleX(1)', opacity: '1', offset: 0.62 },
  { transform: 'scaleX(1)', opacity: '0' },
];

let ready = false;
let canvasEl = null;
let dustCv = null;
let dustCtx = null;
let smokeEl = null;
let vignetteEl = null;
let sweepEl = null;
let giantsEl = null;
let calloutsFxEl = null;
let streakDev = null;
let flashEl = null;
let stageEl = null;
let ctaEl = null;
let ctaItems = [];
let headerEl = null;
let railFxEl = null;
let textRoots = [];
let parts = [];
let dustW = 0;
let dustH = 0;

let pointerFine = false;
let tilt = false;
let tmx = 0;
let tmy = 0;
let mx = 0;
let my = 0;
let streakS = 0;
let streakOn = false;
let warming = false;
let flashSolid = false;
let lastChapter = 0;
let prevF = 1;
let sweepAnim = null;
let lastT = 0;

function sizeDust() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  dustW = Math.max(1, Math.round(dustCv.clientWidth * dpr));
  dustH = Math.max(1, Math.round(dustCv.clientHeight * dpr));
  dustCv.width = dustW;
  dustCv.height = dustH;
}

export function initFx() {
  canvasEl = document.getElementById('footage');
  dustCv = document.getElementById('dust');
  dustCtx = dustCv.getContext('2d');
  smokeEl = document.querySelector('.smoke');
  vignetteEl = document.querySelector('.vignette');
  sweepEl = document.getElementById('sweep');
  giantsEl = document.querySelector('.giants');
  calloutsFxEl = document.getElementById('callouts');
  streakDev = document.getElementById('streak-dev');
  flashEl = document.getElementById('flash');
  stageEl = document.getElementById('stage');
  ctaEl = document.getElementById('cta');
  ctaItems = [...ctaEl.querySelectorAll('.cta-item')];
  headerEl = document.querySelector('.chrome-header');
  railFxEl = document.getElementById('rail');
  textRoots = [...document.querySelectorAll('.tblock')];

  // Mouse parallax: desktop with a fine pointer only (spec section 6).
  pointerFine = window.matchMedia('(pointer: fine)').matches;
  if (pointerFine) {
    window.addEventListener('pointermove', (e) => {
      tmx = (e.clientX / window.innerWidth) * 2 - 1;
      tmy = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  } else if ('DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    // Mobile tilt, only where events already flow — never request permission.
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null || e.beta == null) return;
      tilt = true;
      tmx = Math.min(Math.max(e.gamma / 30, -1), 1);
      tmy = Math.min(Math.max((e.beta - 45) / 30, -1), 1);
    });
  }

  // Dust: 70 particles desktop, 28 mobile. Seeded once, mutated in place.
  sizeDust();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const n = isDesktopView() ? 70 : 28;
  for (let i = 0; i < n; i++) {
    parts.push({
      x: Math.random() * dustW,
      y: Math.random() * dustH,
      vx: (Math.random() * 2 - 1) * 3 * dpr,
      vy: (4 + Math.random() * 6) * dpr,
      s: (0.6 + Math.random() * 1.4) * dpr,
      a: 0.15 + Math.random() * 0.3,
      d: 0.3 + Math.random() * 0.7,
    });
  }
  window.addEventListener('resize', sizeDust);
  ready = true;
}

function fireSweep(forward) {
  if (!sweepEl || !sweepEl.animate) return;
  if (sweepAnim) sweepAnim.cancel();
  sweepEl.style.transformOrigin = forward ? '0 50%' : '100% 50%';
  sweepAnim = sweepEl.animate(SWEEP_KEYS, { duration: 800, easing: 'ease-in-out' });
}

export function updateFx(f, vel, vh) {
  if (!ready) return;
  vh = vh || 0;
  const now = performance.now();
  const dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 0.016;
  lastT = now;

  // Chapter sweep when crossing 1 / 87 / 162 / 229, either direction.
  let ci = 0;
  for (let i = 0; i < CHAPTERS.length; i++) {
    if (f >= CHAPTERS[i]) ci = i;
  }
  if (ci !== lastChapter) {
    lastChapter = ci;
    fireSweep(f >= prevF);
  }
  prevF = f;

  // Mouse / tilt parallax, smoothed at lerp 0.06 per frame.
  if (pointerFine || tilt) {
    mx += (tmx - mx) * 0.06;
    my += (tmy - my) * 0.06;
  }

  // Canvas heat (640-652) shares the filter chain with the velocity streak.
  const p1 = clamp01((vh - 640 * VSCALE) / (12 * VSCALE));
  const sTarget = clamp01((Math.abs(vel) - 40) / 160);
  streakS += (sTarget - streakS) * (1 - Math.exp(-12 * dt)); // settles in ~250 ms
  const devX = 6 * streakS + 4 * p1;
  const bright = 1 + 0.6 * p1;
  const sent = `translate3d(${(mx * 10).toFixed(2)}px, ${(my * 6).toFixed(2)}px, 0)`;
  if (devX >= 0.02 || sTarget > 0 || p1 > 0) {
    streakOn = true;
    streakDev.setAttribute('stdDeviation', `${devX.toFixed(2)} 0`);
    canvasEl.style.filter = `url(#streak-blur) contrast(1.06) saturate(0.92) brightness(${bright.toFixed(3)})`;
    canvasEl.style.transform = `${sent} scaleX(${(1 + 0.035 * streakS).toFixed(4)})`;
  } else {
    if (streakOn) {
      streakOn = false;
      canvasEl.style.filter = '';
    }
    canvasEl.style.transform = sent;
  }
  const warm = streakS > 0.01 || p1 > 0;
  if (warm !== warming) {
    warming = warm;
    vignetteEl.style.background = warm ? V_WARM : V_COOL;
  }

  // Flash overlay (spec section 7). Cubic up, hold, quadratic out.
  let fo = 0;
  if (vh >= 678 * VSCALE) {
    const q = clamp01((vh - 678 * VSCALE) / (52 * VSCALE));
    fo = (1 - q) * (1 - q);
    if (!flashSolid) {
      flashSolid = true;
      flashEl.style.background = FLASH_HEX;
    }
  } else if (vh >= 664 * VSCALE) {
    fo = 1;
    if (!flashSolid) {
      flashSolid = true;
      flashEl.style.background = FLASH_HEX;
    }
  } else if (vh >= 652 * VSCALE) {
    const p = (vh - 652 * VSCALE) / (12 * VSCALE);
    fo = p * p * p;
    const r = 3 + 247 * p;
    flashEl.style.background =
      `radial-gradient(circle at 78% 46%, ${FLASH_HEX} 0%, ${FLASH_HEX} ${r.toFixed(1)}%, transparent ${(r + 25).toFixed(1)}%)`;
    flashSolid = false;
  } else {
    fo = 0;
    flashSolid = false;
  }
  flashEl.style.opacity = fo.toFixed(3);

  // At vh 670 the stage + story chrome hide and the CTA waits beneath the flash.
  // Past the runway end the CTA drops into normal flow (pin released, no jump).
  const showCta = vh >= 670 * VSCALE;
  stageEl.style.visibility = showCta ? 'hidden' : 'visible';
  headerEl.style.visibility = showCta ? 'hidden' : 'visible';
  railFxEl.style.visibility = showCta ? 'hidden' : 'visible';
  ctaEl.classList.toggle('is-flow', vh >= 729.9 * VSCALE);
  ctaEl.style.visibility = showCta ? 'visible' : 'hidden';
  if (showCta) {
    const W = clamp01((vh - 678 * VSCALE) / (52 * VSCALE));
    for (let i = 0; i < ctaItems.length; i++) {
      const o = smooth(i * 0.08, i * 0.08 + 0.3, W);
      ctaItems[i].style.opacity = o.toFixed(3);
      ctaItems[i].style.transform = `translateY(${((1 - o) * 24).toFixed(1)}px)`;
    }
  }

  // Text floats at 1.6x the canvas; giants drift opposite on X.
  const tx = (mx * 16).toFixed(2);
  const ty = (my * 10).toFixed(2);
  for (const r of textRoots) {
    r.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
  }
  calloutsFxEl.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
  giantsEl.style.transform = `translate3d(${(-mx * 6).toFixed(2)}px, 0, 0)`;

  // Smoke opacity follows the playhead: 1 to f145, 0.5 to f262, 0 by f270.
  smokeEl.style.opacity = (1 - 0.5 * smooth(145, 262, f) - 0.5 * smooth(262, 270, f)).toFixed(3);

  // Dust: idle rise + sideways drift, scroll drags streaks past, gone by f268.
  const ctx = dustCtx;
  ctx.clearRect(0, 0, dustW, dustH);
  const fade = 1 - smooth(260, 268, f);
  if (fade > 0) {
    const L = 1 + Math.min(Math.abs(vel) / 12, 14);
    const M = 24;
    ctx.fillStyle = BRASS_HI;
    for (const p of parts) {
      p.x += p.vx * dt;
      p.y += vel * p.d * 0.35 - p.vy * dt;
      if (p.y < -M) p.y += dustH + M * 2;
      else if (p.y > dustH + M) p.y -= dustH + M * 2;
      if (p.x < -M) p.x += dustW + M * 2;
      else if (p.x > dustW + M) p.x -= dustW + M * 2;
      ctx.globalAlpha = p.a * fade;
      ctx.fillRect(p.x, p.y, p.s, p.s * L);
    }
    ctx.globalAlpha = 1;
  }
}
