// text.js — frame-window text visibility, pure function of playhead (spec section 5).
// Opacity = smoothstep(in) * (1 - smoothstep(out)); Y: +28 -> 0 -> -20.
// Children stagger 0.06 of window progress: heading, then sub, then label.
// Visibility + aria-hidden toggle together so reverse scroll unwinds everything.
import { TEXTS, CALLOUTS, CALLOUT_DRAW } from './config.js';

const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Giant words: [element id, window start/end frame, drift side].
// Each fades over 12 frames at its ends (spec section 5).
const GIANTS = [
  { id: 'g-parts', w0: 1, w1: 110, side: -1 },
  { id: 'g-craft', w0: 100, w1: 150, side: 1 },
  { id: 'g-hand', w0: 150, w1: 230, side: -1 },
  { id: 'g-lastword', w0: 225, w1: 300, side: 1 },
];
const GIANT_OPACITY = 0.06; // bone at 6%

let blocks = null;
let calloutsEl = null;
let calloutLines = [];
let giants = [];
let railFill = null;
let railStops = [];
let cue = null;

// Cached once (never allocated inside the ticker after this).
function grab() {
  if (blocks) return;
  blocks = TEXTS.map((t) => ({
    cfg: t,
    root: document.getElementById(t.id),
    kids: [...document.getElementById(t.id).querySelectorAll('[data-s]')],
  }));
  calloutsEl = document.getElementById('callouts');
  calloutLines = CALLOUTS.map((c) => document.querySelector(`#co-${c.id} .co-line`));
  giants = GIANTS.map((g) => document.getElementById(g.id));
  railFill = document.querySelector('.rail-fill');
  railStops = [...document.querySelectorAll('.rail-stop')];
  cue = document.getElementById('scroll-cue');

  // Callout anchor points + leader lengths come from config (tunable).
  CALLOUTS.forEach((c) => {
    const el = document.getElementById(`co-${c.id}`);
    el.style.left = `${c.x}%`;
    el.style.top = `${c.y}%`;
    el.style.setProperty('--co-len', `${c.len}px`);
  });
  // Rail diamonds sit at chapter frames I-V (1, 87, 162, 229, 300).
  railStops.forEach((s) => {
    s.style.top = `${((Number(s.dataset.frame) - 1) / 299) * 100}%`;
  });
}

export function updateText(f) {
  grab();

  for (const b of blocks) {
    const [i0, i1, o0, o1] = b.cfg.win;
    const pin = clamp01((f - i0) / (i1 - i0));
    const pout = clamp01((f - o0) / (o1 - o0));
    const vis = pin > 0 && pout < 1;
    b.root.style.visibility = vis ? 'visible' : 'hidden';
    b.root.setAttribute('aria-hidden', vis ? 'false' : 'true');
    if (!vis) continue;
    for (const k of b.kids) {
      const d = Number(k.dataset.s) * 0.06;
      const cin = smooth(d, d + 0.7, pin);
      const cout = smooth(d, d + 0.7, pout);
      k.style.opacity = (cin * (1 - cout)).toFixed(3);
      k.style.transform = `translateY(${(28 * (1 - cin) - 20 * cout).toFixed(1)}px)`;
    }
  }

  // Callouts fade with T5; leader lines draw over CALLOUT_DRAW.
  const t5win = blocks.find((b) => b.cfg.id === 't5').cfg.win;
  const t5o = smooth(t5win[0], t5win[1], f) * (1 - smooth(t5win[2], t5win[3], f));
  const coVis = t5o > 0.001;
  calloutsEl.style.visibility = coVis ? 'visible' : 'hidden';
  calloutsEl.setAttribute('aria-hidden', coVis ? 'false' : 'true');
  calloutsEl.style.opacity = t5o.toFixed(3);
  const lp = clamp01((f - CALLOUT_DRAW[0]) / (CALLOUT_DRAW[1] - CALLOUT_DRAW[0]));
  for (const ln of calloutLines) {
    if (ln) ln.style.strokeDashoffset = (1 - lp).toFixed(3);
  }

  // Giant words drift +/-7vw across their window (14vw total).
  GIANTS.forEach((g, i) => {
    const el = giants[i];
    const o = smooth(g.w0, g.w0 + 12, f) * (1 - smooth(g.w1 - 12, g.w1, f));
    const vis = o > 0.001;
    el.style.visibility = vis ? 'visible' : 'hidden';
    if (!vis) return;
    const p = clamp01((f - g.w0) / (g.w1 - g.w0));
    const x = g.side < 0 ? -7 + 14 * p : 7 - 14 * p;
    el.style.opacity = (o * GIANT_OPACITY).toFixed(4);
    el.style.transform = `translate3d(${x.toFixed(2)}vw,0,0)`;
  });

  // Progress rail: brass fill = playhead progress; numeral only for active chapter.
  railFill.style.transform = `scaleY(${clamp01((f - 1) / 299).toFixed(4)})`;
  let active = 0;
  railStops.forEach((s, i) => {
    if (f >= Number(s.dataset.frame)) active = i;
  });
  railStops.forEach((s, i) => s.classList.toggle('is-active', i === active));

  // Scroll cue lives only until frame 12 (returns on reverse scroll).
  const cueO = 1 - smooth(8, 12, f);
  cue.style.opacity = cueO.toFixed(3);
  cue.style.visibility = cueO > 0.001 ? 'visible' : 'hidden';
  cue.setAttribute('aria-hidden', cueO > 0.001 ? 'false' : 'true');
}
