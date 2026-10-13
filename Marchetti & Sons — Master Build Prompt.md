# Marchetti & Sons — Master Build Prompt

Oct 13, 2026 · @Nitō

Give this whole document to your coding agent, together with the frames folder and manifest.json. It is written as instructions to the builder, so follow it exactly.

## 1. Role, brief, stack, file structure, hard rules

**Your role.** You are a senior creative developer. Build one static, single-page, scroll-driven cinematic site called **Marchetti & Sons — Fine Arms, Est. 1927**. It is a portfolio piece for a fictional brand: a classic 1930s mafia arms house selling one product, **The Consigliere M-31** (a vintage submachine gun). Tagline: **"Settled by Marchetti."** Airsoft appears only once, as a small line in the footer.

**The story, told only by scrolling.** A pinned full-screen stage plays a 300-frame image sequence on a canvas. The gun assembles from floating parts, is finished and shown, a man in a fedora takes it in his hands, he leans in and fires, and the muzzle flash whites out the screen. The flash dissolves into the buy page.

**Feel.** Quiet, expensive, noir. Slow where the picture is beautiful, fast where it transitions. Scrolling backwards must work perfectly everywhere.

**Stack (exact versions, no others).**

- Vanilla HTML, CSS and ES modules. No framework, no bundler, no build step.
- GSAP 3.12.5 and ScrollTrigger 3.12.5 from cdnjs. Lenis 1.1.13 from jsdelivr.
- Fonts from Google Fonts: Cormorant Garamond (500, 600, 700 and italic 500), Inter (400, 500), and Special Elite (400) for typewriter details.
- Deploy as a static site on Netlify.

**File structure (create exactly this).**

```text
/index.html
/css/base.css        tokens, reset, type, grain, vignette
/css/story.css       stage, text layers, rail, ornaments
/css/finale.css      flash, CTA page, footer, modal
/js/config.js        FPS_SRC, TOTAL_FRAMES, PIN_VH, RAMP, TEXT windows
/js/frames.js        preloader, ImageBitmap cache, canvas draw
/js/engine.js        Lenis + ScrollTrigger, frameAt(), playhead loop
/js/text.js          frame-window text visibility
/js/fx.js            dust, smoke, streak blur, flash, mouse parallax
/js/cta.js           CTA, modal, footer, optional sound toggle
/js/main.js          boot order and reduced-motion branch
/assets/frames/desktop/f_0001.webp … f_0300.webp   (1600×900)
/assets/frames/mobile/f_0001.webp … f_0300.webp    (800×450)
/assets/manifest.json
/assets/svg/            crest, deco corner, sunburst (inline in HTML is also fine)
/netlify.toml
```

**Hard rules (never break these).**

1. Use a `<canvas>` image sequence. Never a `<video>` element, never scrub `currentTime`.
2. Every piece of story text is a pure function of the current playhead frame (smoothstep in and out), never a one-way timeline, so reverse scroll works.
3. Only animate `transform` and `opacity` on DOM layers. No layout-triggering properties during scroll.
4. Lenis drives scroll; GSAP ticker drives Lenis (`lenis.raf(time*1000)`), with `gsap.ticker.lagSmoothing(0)`.
5. Frames load before the intro is released. Show a preloader with a progress count, never a blank screen.
6. All copy in this document is final. Do not rewrite it, do not add lorem ipsum, do not add extra sections.
7. Respect `prefers-reduced-motion` (section 8).
8. Colours, fonts and timings come only from the tokens and config in this document. Do not invent new ones.

## 2. Assets: frames, manifest, what is where

**The footage is 300 WebP frames at 12 fps (25 s of story).** Frame 1 is the first, frame 300 the last. Files are named `f_0001.webp` to `f_0300.webp`. Desktop (1600×900) is used when the viewport is wider than 820 px, mobile (800×450) otherwise. The source clips were 864×480, so the frames are soft by nature; the grain, vignette and a 0.5 px canvas `filter: contrast(1.06) saturate(0.92)` hide this. Do not upscale in CSS beyond cover-fit.

**What happens at which frame.** These frame numbers are estimates read from the footage. Keep them in `config.js` as `EVENTS` so they can be tuned after a scrub preview.

| Frame | Event | What the viewer sees |
| --- | --- | --- |
| 1–19 | Hero hold | Parts floating, almost still. Title sits over it. |
| 19–69 | Clip 1 | Parts drift in and begin to join. |
| 69–73 | Crossfade 1→2 | Baked into the footage, do nothing. |
| 87 | Stock attaches | Wooden stock locks to the receiver. |
| 115 | Drum locks | Round drum magazine clicks in. |
| 121–141 | Finished gun hold | The complete Consigliere, hero shot. |
| 141–145 | Crossfade 2→3 | Baked in. |
| 162 | Man appears | A man in a fedora enters frame. |
| 195 | Gun in hands | He takes hold of the gun. |
| 210–213 | Crossfade 3→4 | Baked in. |
| 229 | Man leans in | He sets his cheek to the stock. |
| 265 | Shot starts | Muzzle flash begins, running to the end. |
| 300 | End | Flash fills the right of the frame. |

**Where things are in the picture (so text never covers the subject).**

- Frames 1–145: the gun is centre to centre-right. Keep text in the **left 38%** of the screen, vertically centred. Big headings may bleed behind the gun.
- Frames 145–229: the man and gun fill the centre. Keep text in the **left 30%** and the **bottom 18%**.
- Frames 229–300: the man is centre-left, the flash goes to the right edge. Keep text in the **bottom-left** only, until the flash whites out the frame.

**Canvas drawing.**

- Size the canvas to the viewport times `devicePixelRatio` (capped at 2). Draw with cover-fit, anchored at 55% horizontally, 50% vertically, and apply an extra scale from section 6.
- Decode every frame into an `ImageBitmap` through `createImageBitmap(blob)`. Load frames 1–90 first, then release the intro, then stream the rest in batches of 12 while the viewer reads the hero. If the viewer scrolls past a frame not yet loaded, draw the nearest loaded frame.
- Memory guard: on mobile keep at most 300 bitmaps (800×450 is small enough). On desktop, if `navigator.deviceMemory` is below 4, load every second frame and double the playhead step.

**manifest.json shape.** Read it at boot to get frame counts and events. Fall back to the constants in `config.js` if it is missing.

```json
{ "fps": 12, "total": 300, "desktop": "1600x900", "mobile": "800x450",
  "events_frames": { "hero_hold_end": 19, "stock_attaches": 87, "drum_locks": 115,
    "finished_gun_hold": [121, 141], "man_appears": 162, "gun_in_hands": 195,
    "man_leans_in": 229, "shot_starts": 265, "end": 300 } }
```

## 3. Design system: palette, type, ornaments

**Palette (CSS custom properties on `:root`, dark only).**

| Token | Hex | Use |
| --- | --- | --- |
| `--ink` | `#0b0908` | Page background, deepest black |
| `--coal` | `#15110e` | Panels, modal, footer |
| `--smoke` | `#2a221c` | Hairlines, borders at 40% |
| `--bone` | `#e9dfcb` | Body text, headings |
| `--parchment` | `#c9b99a` | Secondary text, captions |
| `--brass` | `#b8914a` | Ornaments, rules, numerals, button fill |
| `--brass-hi` | `#e3c57e` | Hover, glints, flash tint |
| `--oxblood` | `#6b1a1a` | One accent: the CTA hover and the seal |
| `--flash` | `#fff4d6` | Muzzle flash only |

Rules: no pure white, no pure black, no gradients except vignette, smoke and the flash. Brass is for lines and one button, never for large areas.

**Typography.**

- Headings: Cormorant Garamond 600, uppercase, letter-spacing 0.08em, `clamp(2.4rem, 6.2vw, 6.5rem)`, line-height 0.95. Giant background headings use 700 at `clamp(7rem, 22vw, 24rem)`, colour `--bone` at 6% opacity.
- Sub-lines: Cormorant Garamond italic 500, `clamp(1.15rem, 1.7vw, 1.7rem)`, colour `--parchment`.
- Body and labels: Inter 400, 15–17 px, line-height 1.65, labels uppercase with 0.22em tracking at 11–12 px.
- Numerals and stamps ("No. 31", spec figures): Special Elite 400, colour `--brass`.
- Max copy width 34ch for headings, 44ch for paragraphs.

**Texture and finish (always on).**

- Film grain: a fixed full-screen overlay, 256×256 SVG `feTurbulence` noise tile, opacity 0.07, `mix-blend-mode: overlay`, animated by stepping `background-position` through 6 offsets at 8 fps.
- Vignette: fixed radial gradient, transparent at 55%, `rgba(11,9,8,0.78)` at 100%.
- Letterbox: 2 thin brass hairlines, 1 px, inset 20 px from top and bottom edges of the stage, 30% opacity. They are not black bars.

**SVG ornaments (write them inline, `stroke="currentColor"`, `fill="none"`, stroke width 1.25, colour `--brass`).**

1. **Crest** (header and footer), `viewBox="0 0 100 112"`: outer shield path `M50 4 L92 16 V52 C92 78 72 94 50 106 C28 94 8 78 8 52 V16 Z`, inner path `M50 12 L84 22 V52 C84 73 68 87 50 97 C32 87 16 73 16 52 V22 Z`, and a centred "M" in Cormorant Garamond 700, 44 px. 44 px tall in the header.
2. **Deco corner**, `<symbol id="deco-corner" viewBox="0 0 48 48">` with `M1 47V1H47 M7 47V7H47 M13 47V13H47`. `<use>` it in all four corners of the stage inset 24 px, rotated 0°/90°/180°/270°, 48 px square, 55% opacity.
3. **Sunburst** (behind the CTA): 48 thin radial lines from a centre point, alternate long and short, 1 px, `--brass` at 14% opacity, slow rotation of one full turn per 240 s.
4. **Leader lines**: a 1 px brass line, 64–120 px long, ending in a 5 px circle, joining a label to a point on the gun. Used only in the spec callouts (section 5). The line draws with `stroke-dashoffset` driven by the text window progress.
5. **Divider**: a 1 px line with a centred diamond (6 px rotated square) between footer blocks.
6. **Progress rail** (right edge, 24 px inset, vertically centred, 220 px tall): a 1 px line with 5 small diamonds at chapter positions I–V (frames 1, 87, 162, 229, 300). The brass fill height equals playhead progress. Current chapter numeral (Roman, Special Elite, 11 px) sits left of its diamond and fades in only for the active chapter. Hidden on screens narrower than 820 px.

## 4. Scroll engine and the speed-ramp map

**The idea.** Scroll position does not map linearly to frames. A table of scroll segments, each with its own frame range and easing, makes the footage rush through transitions and slow almost to a stop on the beautiful moments. A damped playhead then chases the target frame, so even a hard flick glides. This is the "speed ramp" feel: slow-mo holds, then a whoosh.

**Scroll length.** The story section is `730vh` tall (`PIN_VH = 730`). The stage (`#stage`, 100vh, 100vw) is pinned for all of it. After it comes the CTA page in normal flow.

**The ramp table.** Units are viewport heights of scroll inside the pinned section.

| Scroll (vh) | Frames | Ease | Feel | Why |
| --- | --- | --- | --- | --- |
| 0–80 | 1→19 | sine.inOut | Slow-mo | Hero hold. Parts hang in the air, title reads. |
| 80–180 | 19→87 | power2.inOut | Rush | Parts fly together, stock attaches. |
| 180–270 | 87→121 | power2.out | Settle | Drum locks, motion decelerates into the finished gun. |
| 270–350 | 121→141 | sine.inOut | Slow-mo | Finished gun hold. Spec callouts live here. 80vh for 20 frames. |
| 350–440 | 141→195 | power2.inOut | Rush | Man walks in and takes the gun. |
| 440–520 | 195→229 | none | Even | He prepares. Steady, readable. |
| 520–640 | 229→265 | sine.in | Slow-mo to build tension | 120vh for 36 frames, accelerating gently into the shot. |
| 640–670 | 265→300 | none | Whip | Shot. 35 frames in 30vh. Fast. |
| 670–730 | 300 | none | Hold | Frame 300 fixed while the flash and the page reveal run (section 7). |

Tune only the numbers in this table, never the logic.

**config.js.**

```js
export const FPS_SRC = 12;
export const TOTAL_FRAMES = 300;
export const PIN_VH = 730;
export const RAMP = [ // [startVH, endVH, frameStart, frameEnd, ease]
  [0,80,1,19,'sine.inOut'], [80,180,19,87,'power2.inOut'],
  [180,270,87,121,'power2.out'], [270,350,121,141,'sine.inOut'],
  [350,440,141,195,'power2.inOut'], [440,520,195,229,'none'],
  [520,640,229,265,'sine.in'], [640,670,265,300,'none'],
  [670,730,300,300,'none']
];
```

**engine.js, mapping.**

```js
const eases = RAMP.map(r => gsap.parseEase(r[4]));
export function frameAt(vh){
  vh = Math.min(Math.max(vh, 0), PIN_VH);
  for (let i = 0; i < RAMP.length; i++){
    const [a,b,f0,f1] = RAMP[i];
    if (vh <= b || i === RAMP.length - 1){
      const t = b === a ? 1 : Math.min(1, Math.max(0, (vh - a) / (b - a)));
      return f0 + (f1 - f0) * eases[i](t);
    }
  }
}
```

**engine.js, scroll and smoothing.**

```js
const lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 0.9 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

let target = 1, playhead = 1, prev = 1, vel = 0;
ScrollTrigger.create({
  trigger: '#story', start: 'top top',
  end: () => '+=' + window.innerHeight * PIN_VH / 100,
  pin: '#stage', pinSpacing: true, invalidateOnRefresh: true,
  onUpdate: self => { target = frameAt(self.progress * PIN_VH); }
});

const K = 7; // damping stiffness
gsap.ticker.add((time, deltaMs) => {
  const dt = Math.min(deltaMs / 1000, 0.05);
  prev = playhead;
  playhead += (target - playhead) * (1 - Math.exp(-K * dt));
  vel = (playhead - prev) / dt; // frames per second
  draw(playhead, vel);        // frames.js
  updateText(playhead);       // text.js
  updateFx(playhead, vel);    // fx.js
});
```

**Drawing with blend (frames.js `draw`).**

- If `|vel| < 24` frames/s (slow-mo): draw `floor(playhead)` fully, then draw `ceil(playhead)` over it with `globalAlpha = playhead % 1`. This gives the smooth, liquid slow-motion look at 12 fps source.
- If `|vel| >= 24` (fast): draw `round(playhead)` only, no blend (blending at speed looks ghosted).
- Skip the draw if the pair of frames and alpha are unchanged since the last tick.

**Velocity streak (fx.js, the "whoosh").** Apply to the canvas element only, and only while `|vel| > 40`:

- `s = clamp((|vel| - 40) / 160, 0, 1)`
- `transform: scaleX(1 + 0.035*s)` and `filter: blur(0px) → blur(2.2px*s)` horizontally via an inline SVG filter `feGaussianBlur stdDeviation="{6*s} 0"` (horizontal only)
- Tint the vignette 8% warmer (towards `--brass`) while `s > 0`.
- Ease back to none within 250 ms when velocity falls.

**Clamp rules.**

- Never let the playhead overshoot `[1, 300]`.
- On `resize`, `ScrollTrigger.refresh()` and redraw immediately.
- If the user lands mid-page by reload, set `playhead = target` once, with no glide, then resume damping.
- Keyboard: Space, PageDown and arrow keys must scroll normally through Lenis. Do not hijack them.

**Anchors.** Header nav is not provided. The only navigation is the crest (scrolls to top) and a hidden "Skip to the buy page" link that appears on keyboard focus and calls `lenis.scrollTo('#cta', { duration: 1.6 })`.

## 5. Layout and every text element, by frame window

**Fixed chrome (always visible during the story).**

- Top-left: crest, 44 px tall, 32 px from the edges. Beside it, "MARCHETTI & SONS" in Cormorant 600, 13 px, tracking 0.3em, and below it "FINE ARMS · EST. 1927" in Inter, 10 px.
- Top-right: a sound toggle (section 6) as a 20 px speaker icon, off by default.
- Right edge: progress rail (section 3).
- Bottom-centre: "SCROLL" label (Inter, 11 px, tracking 0.3em) with a 1 px, 36 px brass line that pulses downward every 2.4 s. It is visible only until frame 12, then fades out for good (it returns if the playhead goes back below frame 12).
- Four deco corners and two letterbox hairlines.

**How a text block behaves.** Each block has `[inStart, inEnd, outStart, outEnd]` in playhead frames. Opacity is `smoothstep(inStart,inEnd,f) * (1 - smoothstep(outStart,outEnd,f))`. Translate Y goes from +28 px to 0 on the way in and 0 to −20 px on the way out. Block children stagger by 0.06 of the window progress (heading first, then sub-line, then label). Hide with `visibility: hidden` when opacity is 0, so tab order and screen readers skip them.

**Text blocks (all copy is final).**

| # | Frames in→out | Position | Content |
| --- | --- | --- | --- |
| T1 | 1,6 → 15,19 | Left, vertically centred | Label: "CHAPTER I — THE PARTS". Heading: "EVERY GREAT FAMILY". Heading line 2: "STARTS WITH A FEW PIECES." Sub: "Walnut. Blued steel. Brass. Nothing else, nothing less." |
| T2 | 28,38 → 60,70 | Left | Label: "I · THE RECEIVER". Heading: "MILLED, NOT MADE." Body: "Cut from a single bar of forged steel in our Chicago shop, then blued by hand." |
| T3 | 76,86 → 98,108 | Left | Label: "II · THE STOCK". Heading: "WALNUT, OILED SEVEN TIMES." Body: "Every stock is fitted to its receiver and never to another." |
| T4 | 108,114 → 124,130 | Left, lower | Label: "III · THE DRUM". Heading: "FIFTY ROUNDS. ONE ARGUMENT." |
| T5 | 122,128 → 140,145 | Left, centred, with spec callouts | Label: "THE CONSIGLIERE M-31". Heading: "SETTLED BY MARCHETTI." Body: "The only argument we have never lost." See callouts below. |
| T6 | 166,176 → 188,196 | Left | Label: "CHAPTER II — THE MAN". Heading: "EVERY GUN NEEDS A STEADY HAND." |
| T7 | 200,208 → 222,229 | Bottom-left | Sub (italic): "Some men carry a name. Some men carry a Marchetti." |
| T8 | 238,246 → 258,264 | Bottom-left | Label: "CHAPTER III — THE LAST WORD". Heading: "WE DON'T RAISE OUR VOICES." |
| T9 | 264,267 → 270,274 | Bottom-left | Heading (large, brief): "WE RAISE THE STAKES." It cuts out almost immediately as the flash begins. |

**Spec callouts (T5 only).** Three leader-line callouts, each a label plus a 1 px leader line that draws in over frames 124→136 and fades with T5. Place them on the gun with percent coordinates of the frame, and expose them in `config.js` as `CALLOUTS` for tuning:

- "CALIBRE · .45 ACP" pointing at the barrel, at 58% x, 47% y.
- "FED BY · 50-ROUND DRUM" pointing at the drum, at 52% x, 61% y.
- "STOCK · OILED AMERICAN WALNUT" pointing at the stock, at 41% x, 52% y.

The callout text sits in Special Elite 12 px, colour `--brass`, with the number-like part in `--bone`. These percentages are estimates, so add a debug flag `?debug=1` that draws the percent grid and prints the current playhead frame in the top-left corner. Remove nothing from production, the flag just stays dormant.

**Giant background words (parallax text).** One word per chapter set behind the footage layer at 6% bone opacity, cropped by the viewport edge, moving slower than the scroll (section 6): "PARTS" (frames 1–110, bleeding off the left), "CRAFT" (100–150, off the right), "HAND" (150–230, off the left), "LAST WORD" (225–300, off the right). Each fades in and out over 12 frames at its ends.

**Mobile layout (width below 820 px).** All text blocks sit in the lower third, centred, over a 55% black-to-transparent gradient that rises from the bottom (so text stays readable on top of footage). Heading sizes drop to `clamp(1.7rem, 7.5vw, 2.6rem)`. Callouts become a simple stacked list under T5's heading, with no leader lines. Giant words are hidden.

## 6. Parallax, overlays and ambient effects

**Layer stack inside `#stage` (back to front).**

| z | Layer | Behaviour |
| --- | --- | --- |
| 0 | Background `--ink` with a faint radial warm glow at 62% x, 50% y (`rgba(184,145,74,0.08)`) | Static |
| 1 | Giant words | Move on X by ± 14vw across their window, so about 0.35× the perceived speed of the foreground |
| 2 | Smoke (3 blurred blobs) | Drift on X and Y, see below |
| 3 | Footage canvas | Scale push, see below, plus mouse parallax |
| 4 | Dust canvas | Particles, see below |
| 5 | Spec callouts and text blocks | Mouse parallax at 1.6× the canvas amount, so text floats in front |
| 6 | Vignette, grain, letterbox hairlines, corners | Fixed |
| 7 | Flash overlay, preloader | Section 7 |

**Footage scale push (the slow cinematic creep).** Scale the canvas from 1.00 at frame 1 to 1.07 at frame 145, hold, then ease from 1.07 to 1.12 over frames 229 to 265, and snap back to 1.04 as the flash covers frame 270 to 300. The scale follows the playhead, so it is also reversible. Always scale around the point (55%, 50%).

**Mouse parallax (desktop, pointer fine only).**

- Track `pointermove` normalised to −1…+1 on each axis. Smooth with `lerp 0.06` per frame.
- Canvas translate: `x * 10px, y * 6px`. Text layer: `x * 16px, y * 10px` in the same direction. Giant words: `x * -6px` in the opposite direction.
- Disable on touch devices and with reduced motion. On mobile use device tilt only if permission is already granted, never request it.

**Smoke.** Three absolutely positioned divs, 60vw by 60vw, `border-radius: 50%`, `background: radial-gradient(closest-side, rgba(233,223,203,0.10), transparent)`, `filter: blur(60px)`, `mix-blend-mode: screen`. Each drifts in a 40–60 s loop (alternate, sine) by about 12vw on X and 8vh on Y. Opacity follows the playhead: 1.0 for frames 1 to 145, 0.5 for 145 to 262, and 0 by 270.

**Dust (fx.js).**

- A fixed 2D canvas, 70 particles on desktop and 28 on mobile. Each particle has a size of 0.6 to 2 px, a colour of `--brass-hi` at 0.15 to 0.45 alpha, and its own depth `d` from 0.3 to 1.
- Idle drift: up 4 to 10 px/s and sideways ±3 px/s, with wrapping at the edges.
- Scroll response: add vertical offset `playhead velocity * d * 0.35 px` per frame, so fast scrolls pull streaks of dust past. Stretch each particle into a line of length `1 + min(|vel|/12, 14)` px while moving fast.
- Fade all dust to 0 as the flash begins (frame 268).

**Chapter title sweep.** When the playhead crosses a chapter start (frames 1, 87, 162, 229) from either direction, run a 0.5 s brass hairline wipe across the top of the stage (`scaleX` 0→1, origin left when moving forward, right when moving back) then fade it. No sound, no text.

**Optional sound (off by default).**

- A speaker icon toggle top-right. Starts muted, remembers the choice in a try/catch-wrapped `localStorage` read. Never autoplays; audio starts only after the first user click on the toggle.
- Synthesise everything with the Web Audio API, no files: a low drone (two detuned sine oscillators near 55 Hz and 55.6 Hz at gain 0.04), vinyl-style crackle (filtered noise bursts, gain 0.01), a 2-pulse click at frame 87 and 115 (short filtered noise, 40 ms), and a muted gunshot at frame 265 (white noise burst, 180 ms exponential decay, lowpass at 900 Hz, gain 0.25, plus a 60 Hz sine thump).
- Fire each cue only when the playhead crosses its frame forwards. Fade the drone to 0 over 600 ms on mute.

## 7. Finale, CTA page, footer, modal

**Flash timeline (driven by scroll, so it is reversible).** `#flash` is a fixed full-screen div, `background: var(--flash)`, `opacity: 0`, `pointer-events: none`. Let `f` be the playhead and `vh` the scroll position inside the pinned section.

| Scroll (vh) | Playhead | Effect |
| --- | --- | --- |
| 640–652 | 265→300 | Footage plays the shot. Canvas gets `filter: brightness(1→1.6)` and `blur` 0→4 px (horizontal). Vignette tints brass. |
| 652–664 | 300 | Flash overlay opacity 0→1 with `power3.in`. A 3% radial burst at 78% x, 46% y grows to full screen while it does so. |
| 664–678 | 300 | Full white-gold. Hold at 1. At 670, hide the stage content (`visibility: hidden`) and show the CTA page in place beneath the flash. |
| 678–730 | 300 | Flash fades 1→0 with `power2.out`, revealing the CTA page. CTA elements animate in during this window (below). |

Implementation note: the CTA page (`#cta`) sits directly after the pinned `#story` in the DOM. For the reveal, make `#cta` `position: sticky; top: 0` inside a 60vh runway that is part of the pinned range, or equivalently, pin `#cta` over the stage from vh 664 onward. Pick whichever keeps the flash fade and the CTA entrance on the same scroll axis, with no jump when the pin releases. After vh 730, the CTA is a normal-flow, 100vh page and the page scrolls on.

**CTA page layout (full screen, centred composition).**

- Background `--ink`, sunburst behind (section 3), a soft brass glow at the centre, grain and vignette still on.
- Centre column, max width 760 px, everything centre-aligned, in this order:
  1. Crest, 72 px tall, rises 24 px and fades in first.
  2. Label: "THE CONSIGLIERE M-31 · LIMITED RUN OF 1,931".
  3. Heading: "A FAMILY BUSINESS, SINCE 1927." at the large heading size.
  4. Sub (italic): "One gun. Fitted by hand. Delivered with discretion."
  5. A thin divider with the diamond.
  6. A three-column spec strip, each column a Special Elite figure above an Inter label: "50 / ROUND DRUM", ".45 / ACP", "7 / COATS OF OIL".
  7. The price line: "$2,450" in Cormorant 600 at 56 px, with "or four payments of $612.50" in Inter 13 px, `--parchment`.
  8. **Primary button**: "MAKE AN OFFER YOU CAN'T REFUSE". Fill `--brass`, text `--ink`, Inter 600, 13 px, tracking 0.2em, padding 20 px by 40 px, 1 px border `--brass-hi`, no border radius. On hover, fill becomes `--oxblood`, text `--bone`, and a 1 px offset outline appears 6 px outside. It rises 2 px. Focus ring is a 2 px `--brass-hi` outline offset 4 px.
  9. Secondary text link underneath: "Request a private viewing", Cormorant italic, underlined with a brass hairline.
- Entrance: the nine items stagger in over the 678–730 window (each 0.08 of the window apart, opacity 0→1 and translate Y 24→0).
- Four deco corners come back at the page edges, 64 px.
- The price and "limited run" figures are fictional. Do not make a real checkout.

**What the CTA does.** Both the button and the link open a modal, `#modal`, on a `rgba(11,9,8,0.82)` backdrop with a 12 px blur:

- A 520 px wide panel in `--coal`, a 1 px `--brass` border at 40%, deco corners at its corners.
- Heading: "THIS IS A PORTFOLIO PIECE."
- Body: "Marchetti & Sons is a fictional brand, built to show what a scroll-driven story can do. There is nothing to buy. If you'd like something this cinematic for your own brand, let's talk."
- Two buttons: primary "START A PROJECT" (a `mailto:` link to a placeholder `hello@example.com`, easy to replace) and secondary "BACK TO THE FAMILY" which closes the modal.
- Close on Escape and on backdrop click. Trap focus inside. Return focus to the opener. Lock page scroll while open (`lenis.stop()`).

**"In the case" band (between the CTA and the footer, normal flow).** A 70 vh section on `--coal`, two columns on desktop and one on mobile, with a 1 px brass top rule and a 72 px vertical padding. Left: label "IN THE CASE" and heading "EVERYTHING THAT ARRIVES AT YOUR DOOR." Right: a short list of five lines with a small diamond bullet: "The Consigliere M-31, blued and numbered", "Fifty-round drum magazine", "Walnut stock, oiled seven times", "Oiled cloth and brass cleaning rod", "Certificate signed by a Marchetti". Each line fades up as it enters the viewport (ScrollTrigger, toggle actions `play none none reverse`).

**Footer.** `--ink`, 56 px padding, 1 px brass top rule, divider with diamond above the legal line.

- Left: crest (44 px), "MARCHETTI & SONS", "FINE ARMS · EST. 1927".
- Centre: three plain links as labels in Inter 11 px caps: "The Consigliere", "Private Viewing", "The Family". They are decorative anchors that scroll to top, to the CTA and to the case band respectively.
- Right: "Made by Nitō — a portfolio project", linking to `#` (to be replaced).
- Bottom line, Inter 11 px, `--parchment` at 70%: "Marchetti & Sons is a fictional brand created for a design portfolio. Replica and airsoft models only — no live firearms are sold or implied." This is the one place airsoft is mentioned. Keep it that small.
- A 'Back to the beginning' link with an up-arrow glyph that calls `lenis.scrollTo(0, { duration: 2.4 })`, replaying the story in reverse.

## 8. Mobile, accessibility, performance, SEO, deploy

**Mobile (width below 820 px).**

- Use the 800×450 frames. Cover-fit the canvas to the viewport height (`100svh`), anchored at 60% horizontally so the gun and the man stay in view.
- `PIN_VH` becomes 560 on mobile. Scale every `RAMP` scroll boundary by 560/730 in code (frame ranges stay identical).
- Lenis `syncTouch: false`, so native touch scrolling is used. Use `100svh` for the stage and `ScrollTrigger.config({ ignoreMobileResize: true })` to stop the address bar causing jumps.
- Text moves to the lower third (section 5). Hide the progress rail, giant words and mouse parallax. Dust drops to 28 particles. Smoke drops to one blob.
- Tap targets are at least 48 px tall. The CTA button spans the full width up to 360 px.

**Accessibility.**

- The page has one `h1` (the hero heading in T1) and each chapter heading is an `h2`. The canvas has `role="img"` and `aria-label="A vintage submachine gun assembles piece by piece, is taken up by a man in a fedora, and fires."`.
- Text blocks are real DOM text with `aria-hidden` toggled with visibility. Give the story container `aria-live="off"`.
- Colour contrast: `--bone` on `--ink` is above 12:1. `--parchment` on `--ink` is above 8:1. Never put `--brass` text smaller than 14 px on a light surface.
- Visible focus on all interactive elements (2 px `--brass-hi` outline, 4 px offset).
- **Reduced motion (`prefers-reduced-motion: reduce`).** Do not pin, do not scrub, do not smooth-scroll, no dust, smoke drift, grain animation, streak blur, flash or parallax. Replace the story with a vertical sequence of 5 stills (frames 1, 87, 125, 195, 265) with their chapter texts beside them (stacked on mobile), fading in with a plain 0.3 s opacity transition. Then show the CTA page, footer and modal as usual. No other copy is added for this mode.
- No-JS: `<noscript>` shows frame 125 as a static `img` with T5's heading and the CTA text, and the footer.

**Performance budget.**

- Initial payload before the intro is released (HTML, CSS, JS, fonts, frames 1–90 desktop): under 6 MB. Total frames: desktop about 22 MB at most, mobile about 8 MB at most (WebP quality 78 and 74 respectively).
- Preload only the first 3 frames and the fonts with `<link rel="preload">`. Everything else is loaded from JS.
- Preloader: full-screen `--ink`, crest centred (pulses 0.6→1.0 opacity), a 160 px brass hairline progress bar beneath it, and the text "PREPARING THE FAMILY BUSINESS… {n}%" in Inter 11 px caps. The count reflects the first 90 frames. Fade out over 0.8 s when done, then run the hero entrance (T1 at frame 1 animates as in section 5).
- The draw loop must stay below 4 ms per frame on a mid-range laptop. Don't create objects inside the ticker. Pause the ticker when `document.hidden`.
- Lazy-initialise the dust and smoke only after the intro is released.
- Target Lighthouse performance 85+ on desktop, accessibility 95+, best practices 95+, SEO 100.

**SEO and meta.**

- `<title>`: "Marchetti & Sons — Fine Arms, Est. 1927 · The Consigliere M-31".
- `<meta name="description">`: "A scroll-driven cinematic story: a vintage submachine gun assembles piece by piece, and the muzzle flash reveals the buy page. A fictional brand, built as a portfolio piece."
- Open Graph and Twitter card tags using frame 125 as `og:image` (export a 1200×630 crop to `/assets/og.jpg`).
- `theme-color` `#0b0908`. A crest favicon as an inline SVG data URI. `lang="en"`.

**netlify.toml.**

```toml
[build]
  publish = "."

[[headers]]
  for = "/assets/frames/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

## 9. Acceptance checklist and don'ts

**Do not hand the work back until every box is true.** Test each in a real browser, on desktop and on a phone-sized viewport.

- [ ] Preloader shows a live percentage and hands over to the hero without a blank frame.
- [ ] Scrolling slowly through frames 1–19 is almost still; scrolling the same distance through 19–87 visibly rushes.
- [ ] The finished-gun hold (frames 121–141) feels like slow motion over 80 vh, and the three callouts draw in with their leader lines.
- [ ] A hard mouse-wheel flick glides to its target without stepping or jumping, and shows the horizontal streak and dust stretch.
- [ ] Scrolling backwards plays the whole story in reverse: the text, callouts, scale, smoke, dust and the flash all unwind.
- [ ] No text ever sits on the gun, the man's hands or the flash.
- [ ] Giant words, smoke and dust move at different speeds than the footage (visible parallax).
- [ ] Flash whites out smoothly, the CTA page is revealed with no jump, no scroll-position jolt when the pin releases.
- [ ] Modal opens, traps focus, closes on Escape and backdrop, and returns focus.
- [ ] Progress rail fills with the playhead and the right chapter numeral shows.
- [ ] `?debug=1` prints the playhead frame and the callout grid.
- [ ] The sound toggle is off at load, and turning it on gives the drone and the cues once each, going forwards only.
- [ ] Mobile: text in the lower third, readable, no horizontal scroll, no address-bar jump.
- [ ] `prefers-reduced-motion` shows the five-stills version, with no animation.
- [ ] Lighthouse targets from section 8 are met, and the console is empty.
- [ ] Airsoft is mentioned exactly once, in the footer legal line.

**Don'ts.**

- Do not use a `<video>` element, a scroll-jacking library other than Lenis, a CSS framework, or React.
- Do not use any colour, font or timing outside the tokens in this document.
- Do not change, shorten or add copy. Do not add a navigation bar, a cookie banner, a newsletter form or a testimonials section.
- Do not use emoji anywhere.
- Do not use stock photos, extra images or AI-generated art beyond the 300 frames. All ornaments are SVG.
- Do not block the main thread: no synchronous decoding loops, no layout reads inside the ticker.
- Do not put real prices, a real checkout or any real person's name or likeness on the page.

**Known limits to preserve, not fix.** The footage is 864×480 upscaled, so it is soft, and the last clip's flash runs off the right edge. The frame numbers in section 2 are estimates. Build the `?debug=1` overlay first, scrub through the sequence once, and adjust the numbers in `config.js` (`EVENTS`, `RAMP`, text windows and `CALLOUTS`) so the effects land exactly on the beats. Everything else stays as written.
