// main.js — boot order, incl. the reduced-motion branch (spec section 8).
import { preloadFrames } from './frames.js';
import { initEngine, onTick, getLenis } from './engine.js';
import { initFx } from './fx.js';
import { initCta, updateSound } from './cta.js';

const preloader = document.getElementById('preloader');
const preloaderPct = document.getElementById('preloader-pct');
const preloaderFill = document.getElementById('preloader-fill');
const canvas = document.getElementById('footage');
const debugEl = document.getElementById('debug');
const debugGrid = document.getElementById('debug-grid');
const debug = new URLSearchParams(window.location.search).get('debug') === '1';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (debug && debugEl) {
  debugEl.hidden = false;
  if (debugGrid) debugGrid.hidden = false;
  onTick(({ playhead, target, vel }) => {
    debugEl.textContent =
      `frame ${playhead.toFixed(1)} / target ${target.toFixed(1)} / vel ${vel.toFixed(1)} f/s`;
  });
}

// Fixed chrome navigation (spec section 4): crest scrolls to top.
const brandHome = document.getElementById('brand-home');
if (brandHome) {
  brandHome.addEventListener('click', () => {
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(0, { duration: 1.6 });
    else window.scrollTo(0, 0);
  });
}

// Skip link (spec section 4).
const skipLink = document.querySelector('.skip-link');
if (skipLink) {
  skipLink.addEventListener('click', (e) => {
    const cta = document.getElementById('cta');
    const lenis = getLenis();
    e.preventDefault();
    if (lenis && cta) lenis.scrollTo('#cta', { duration: 1.6 });
    else if (cta) cta.scrollIntoView();
  });
}

async function boot() {
  try {
    await preloadFrames(canvas, (n, total) => {
      const pct = Math.round((n / total) * 100);
      if (preloaderPct) preloaderPct.textContent = String(pct);
      if (preloaderFill) preloaderFill.style.width = `${pct}%`;
    });
  } catch (err) {
    console.error('Frame preload failed:', err);
  }

  initFx(); // dust + smoke + parallax seeding, after the intro is released
  initCta(); // modal, footer, sound toggle, case reveals, sunburst
  initEngine();

  // Sound cues ride the same ticker (forward crossings only).
  onTick(({ playhead }) => updateSound(playhead));

  // Release the intro: 0.8 s fade, then the hero entrance (T1 at frame 1).
  if (preloader) {
    preloader.classList.add('is-done');
    window.setTimeout(() => {
      preloader.style.display = 'none';
    }, 850);
  }
}

if (reduceMotion) {
  // Static stills mode: no pin, scrub, smooth-scroll, or ambient effects.
  // CTA, case band, footer and modal render as usual below the stills.
  document.documentElement.classList.add('rm');
  if (preloader) preloader.style.display = 'none';
  initCta(); // modal, footer, sound toggle, sunburst (reveals self-skip)
  const stills = [...document.querySelectorAll('.rm-still')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.2 });
    stills.forEach((s) => io.observe(s));
  } else {
    stills.forEach((s) => s.classList.add('in'));
  }
} else {
  boot();
}
