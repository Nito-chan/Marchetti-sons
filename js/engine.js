// engine.js — Lenis + ScrollTrigger, frameAt(), damped playhead loop (spec sections 4 + 8).
import { PIN_VH, RAMP, TOTAL_FRAMES } from './config.js';
import { draw, sizeCanvas } from './frames.js';
import { updateText } from './text.js';
import { footageScale, updateFx } from './fx.js'; // scale push lands in step 4

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true }); // no address-bar jumps (mobile)

// Mobile shortens the pin to 560vh; RAMP scroll boundaries scale with it,
// frame ranges stay identical (spec section 8).
const MOBILE_PIN_VH = 560;
const mobileView = window.innerWidth <= 820;
const PIN_EFF = mobileView ? MOBILE_PIN_VH : PIN_VH;
const VE = PIN_EFF / PIN_VH;
const RAMP_EFF = RAMP.map(([a, b, f0, f1, e]) => [a * VE, b * VE, f0, f1, e]);
const eases = RAMP_EFF.map((r) => gsap.parseEase(r[4]));

export function frameAt(vh) {
  vh = Math.min(Math.max(vh, 0), PIN_EFF);
  for (let i = 0; i < RAMP_EFF.length; i++) {
    const [a, b, f0, f1] = RAMP_EFF[i];
    if (vh <= b || i === RAMP_EFF.length - 1) {
      const t = b === a ? 1 : Math.min(1, Math.max(0, (vh - a) / (b - a)));
      return f0 + (f1 - f0) * eases[i](t);
    }
  }
  return TOTAL_FRAMES;
}

let lenis = null;
let target = 1;
let playhead = 1;
let prev = 1;
let vel = 0;
let scrollVH = 0; // scroll position inside the pinned section (drives the flash)
const K = 7; // damping stiffness
const tickers = new Set(); // step 2: debug overlay; later steps reuse freely

export function onTick(fn) {
  tickers.add(fn);
  return () => tickers.delete(fn);
}
export function getPlayhead() { return playhead; }
export function getTarget() { return target; }
export function getVelocity() { return vel; }
export function getLenis() { return lenis; }

export function initEngine() {
  // syncTouch false: native touch scrolling, Lenis still observes it.
  lenis = new Lenis({ duration: 1.15, smoothWheel: true, syncTouch: false, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  const st = ScrollTrigger.create({
    trigger: '#story',
    start: 'top top',
    end: () => '+=' + (window.innerHeight * PIN_EFF) / 100,
    pin: '#stage',
    pinSpacing: true,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      target = frameAt(self.progress * PIN_EFF);
      scrollVH = self.progress * PIN_EFF;
    },
  });

  const ensurePin = () => {
    ScrollTrigger.refresh();
    // The pin must contribute ~PIN_EFF of scroll; otherwise re-measure once settled.
    if (st.end - st.start < window.innerHeight * 6) {
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }
  };
  ensurePin();
  // Late layout shifts (webfonts, images) silently break the pin: re-measure.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(ensurePin);
  }
  window.addEventListener('load', ensurePin);
  // Reload landing mid-page: snap with no glide, then resume damping.
  target = frameAt(st.progress * PIN_EFF);
  scrollVH = st.progress * PIN_EFF;
  playhead = prev = target;
  vel = 0;
  draw(playhead, 0, footageScale(playhead));

  gsap.ticker.add((time, deltaMs) => {
    const dt = Math.min(deltaMs / 1000, 0.05);
    prev = playhead;
    playhead += (target - playhead) * (1 - Math.exp(-K * dt));
    playhead = Math.min(Math.max(playhead, 1), TOTAL_FRAMES);
    vel = dt > 0 ? (playhead - prev) / dt : 0; // frames per second
    draw(playhead, vel, footageScale(playhead)); // frames.js
    updateText(playhead); // text.js
    updateFx(playhead, vel, scrollVH); // fx.js
    tickers.forEach((fn) => fn({ playhead, target, vel, scrollVH }));
  });

  // Pause all tickers in a hidden tab; dt clamp covers the resume.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) gsap.ticker.sleep();
    else gsap.ticker.wake();
  });

  window.addEventListener('resize', () => {
    sizeCanvas();
    ScrollTrigger.refresh();
    draw(playhead, 0, footageScale(playhead));
  });
}
