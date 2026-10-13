// cta.js — CTA support, case band, footer, modal, ambient sound (spec sections 6-7).
import { getLenis } from './engine.js';

// ---------- sunburst (48 thin radial lines, alternate long/short) ----------
function buildSunburst() {
  const g = document.getElementById('rays');
  if (!g) return;
  const NS = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const r1 = i % 2 === 0 ? 120 : 180;
    const r2 = 290;
    const ln = document.createElementNS(NS, 'line');
    ln.setAttribute('x1', (300 + Math.cos(a) * r1).toFixed(1));
    ln.setAttribute('y1', (300 + Math.sin(a) * r1).toFixed(1));
    ln.setAttribute('x2', (300 + Math.cos(a) * r2).toFixed(1));
    ln.setAttribute('y2', (300 + Math.sin(a) * r2).toFixed(1));
    ln.style.stroke = 'var(--brass)';
    ln.style.strokeWidth = '1';
    ln.style.opacity = '0.14';
    g.appendChild(ln);
  }
}

// ---------- modal ----------
const modal = () => document.getElementById('modal');
let lastOpener = null;

function focusables() {
  return [...modal().querySelectorAll('a[href], button:not([disabled])')];
}

function onModalKey(e) {
  if (e.key === 'Escape') {
    closeModal();
    return;
  }
  if (e.key !== 'Tab') return;
  const items = focusables();
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function openModal(opener) {
  lastOpener = opener || document.activeElement;
  modal().classList.add('open');
  modal().setAttribute('aria-hidden', 'false');
  const lenis = getLenis();
  if (lenis) lenis.stop();
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onModalKey);
  const items = focusables();
  if (items[0]) items[0].focus();
}

function closeModal() {
  modal().classList.remove('open');
  modal().setAttribute('aria-hidden', 'true');
  const lenis = getLenis();
  if (lenis) lenis.start();
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onModalKey);
  if (lastOpener && lastOpener.focus) lastOpener.focus();
}

// ---------- ambient sound (Web Audio, synthesised, off by default) ----------
let audioOn = false;
let actx = null;
let master = null;
let noiseBuf = null;
let prevSF = 1;

function ensureAudio() {
  if (actx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  actx = new AC();
  master = actx.createGain();
  master.gain.value = 0;
  master.connect(actx.destination);

  // Low drone: two detuned sines near 55 Hz at gain 0.04.
  const droneGain = actx.createGain();
  droneGain.gain.value = 0.04;
  droneGain.connect(master);
  [55, 55.6].forEach((fr) => {
    const o = actx.createOscillator();
    o.type = 'sine';
    o.frequency.value = fr;
    o.connect(droneGain);
    o.start();
  });

  // Shared 2 s noise buffer.
  noiseBuf = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  // Vinyl-style crackle bed: filtered noise at gain 0.01.
  const src = actx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const lp = actx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 4000;
  const cg = actx.createGain();
  cg.gain.value = 0.01;
  src.connect(lp);
  lp.connect(cg);
  cg.connect(master);
  src.start();
}

function noiseBurst({ dur, freq, type, peak }) {
  const t = actx.currentTime;
  const src = actx.createBufferSource();
  src.buffer = noiseBuf;
  const flt = actx.createBiquadFilter();
  flt.type = type;
  flt.frequency.value = freq;
  const g = actx.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(flt);
  flt.connect(g);
  g.connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function clickCue() {
  noiseBurst({ dur: 0.04, freq: 2500, type: 'bandpass', peak: 0.3 });
}

function shotCue() {
  noiseBurst({ dur: 0.18, freq: 900, type: 'lowpass', peak: 0.25 });
  const t = actx.currentTime;
  const o = actx.createOscillator();
  o.type = 'sine';
  o.frequency.value = 60;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + 0.25);
}

function setAudio(on) {
  audioOn = on;
  const btn = document.getElementById('sound-toggle');
  if (btn) {
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  try {
    localStorage.setItem('mns-sound', on ? '1' : '0');
  } catch (err) {
    // private mode etc: preference simply doesn't persist
  }
  if (on) {
    ensureAudio();
    actx.resume();
    master.gain.cancelScheduledValues(actx.currentTime);
    master.gain.setTargetAtTime(1, actx.currentTime, 0.1);
  } else if (actx) {
    master.gain.setTargetAtTime(0, actx.currentTime, 0.2); // ~600 ms fade
  }
}

// Cues fire on forward crossings only.
export function updateSound(f) {
  if (!audioOn || !actx) {
    prevSF = f;
    return;
  }
  if (prevSF < 87 && f >= 87) clickCue();
  if (prevSF < 115 && f >= 115) clickCue();
  if (prevSF < 265 && f >= 265) shotCue();
  prevSF = f;
}

// ---------- boot ----------
export function initCta() {
  buildSunburst();

  // Modal openers + closers.
  document.querySelectorAll('[data-modal-open]').forEach((el) => {
    el.addEventListener('click', () => openModal(el));
  });
  document.querySelectorAll('#modal [data-close]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  // Decorative footer anchors (top / CTA / case) + replay link.
  document.querySelectorAll('[data-scroll]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const sel = el.getAttribute('data-scroll');
      const node = sel === '#top' ? document.body : document.querySelector(sel);
      const lenis = getLenis();
      e.preventDefault();
      const dur = Number(el.getAttribute('data-duration')) || 1.6;
      if (lenis && node) lenis.scrollTo(sel === '#top' ? 0 : sel, { duration: dur });
      else if (node) node.scrollIntoView();
    });
  });

  // Sound toggle. Starts muted; remembers the choice (never autoplays).
  const btn = document.getElementById('sound-toggle');
  let stored = false;
  try {
    stored = localStorage.getItem('mns-sound') === '1';
  } catch (err) {
    stored = false;
  }
  if (stored) {
    // Restore the pressed visual only; audio still starts on toggle click.
    btn.classList.add('is-on');
    btn.setAttribute('aria-pressed', 'true');
  }
  btn.addEventListener('click', () => {
    if (!audioOn) setAudio(true);
    else setAudio(false);
  });

  // Case band: each line fades up entering the viewport, reverses back out.
  // Skipped under reduced motion (spec section 8): lines stay visible.
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.utils.toArray('.case-item').forEach((el) => {
      gsap.from(el, {
        y: 24,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
      });
    });
  }
}
