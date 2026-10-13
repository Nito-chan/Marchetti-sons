// config.js — FPS_SRC, TOTAL_FRAMES, PIN_VH, RAMP, TEXTS, EVENTS, CALLOUTS.
// Tune only the numbers here, never the engine logic (spec section 4).

export const FPS_SRC = 12;
export const TOTAL_FRAMES = 300;
export const PIN_VH = 730;

// Speed-ramp map: [startVH, endVH, frameStart, frameEnd, ease].
// Slow-mo holds, then a whoosh through transitions.
export const RAMP = [
  [0, 80, 1, 19, 'sine.inOut'],
  [80, 180, 19, 87, 'power2.inOut'],
  [180, 270, 87, 121, 'power2.out'],
  [270, 350, 121, 141, 'sine.inOut'],
  [350, 440, 141, 195, 'power2.inOut'],
  [440, 520, 195, 229, 'none'],
  [520, 640, 229, 265, 'sine.in'],
  [640, 670, 265, 300, 'none'],
  [670, 730, 300, 300, 'none'],
];

// Text windows: [inStart, inEnd, outStart, outEnd] in playhead frames.
// pos: 'left' | 'left-lower' | 'bottom' (spec section 5).
export const TEXTS = [
  { id: 't1', win: [1, 6, 15, 19], pos: 'left' },
  { id: 't2', win: [28, 38, 60, 70], pos: 'left' },
  { id: 't3', win: [76, 86, 98, 108], pos: 'left' },
  { id: 't4', win: [108, 114, 124, 130], pos: 'left-lower' },
  { id: 't5', win: [122, 128, 140, 145], pos: 'left' },
  { id: 't6', win: [166, 176, 188, 196], pos: 'left' },
  { id: 't7', win: [200, 208, 222, 229], pos: 'bottom' },
  { id: 't8', win: [238, 246, 258, 264], pos: 'bottom' },
  { id: 't9', win: [264, 267, 270, 274], pos: 'bottom' },
];

// Story beats in playhead frames (estimates read from the footage;
// confirm against the ?debug=1 scrub preview, then tune here).
export const EVENTS = {
  hero_hold_end: 19,
  c1_to_c2_crossfade: [69, 73],
  stock_attaches: 87,
  drum_locks: 115,
  finished_gun_hold: [121, 141],
  c2_to_c3_crossfade: [141, 145],
  man_appears: 162,
  gun_in_hands: 195,
  c3_to_c4_crossfade: [210, 213],
  man_leans_in: 229,
  shot_starts: 265,
  end: 300,
};

// Spec callouts for T5 (frame % coordinates on the finished-gun hold).
// Leader lines draw in over CALLOUT_DRAW frames, then fade with T5.
// len: leader-line length in px (spec range 64-120).
export const CALLOUTS = [
  { id: 'calibre', label: 'CALIBRE', value: '.45 ACP', x: 58, y: 47, len: 120 },
  { id: 'drum', label: 'FED BY', value: '50-ROUND DRUM', x: 52, y: 61, len: 96 },
  { id: 'stock', label: 'STOCK', value: 'OILED AMERICAN WALNUT', x: 41, y: 52, len: 72 },
];
export const CALLOUT_DRAW = [124, 136];
