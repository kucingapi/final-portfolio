# Motion Spec — Novel Bafagih Portfolio

Reference: [Happybase on Awwwards](https://www.awwwards.com/sites/happybase) (SOTD, Jan 2024). The live site is gone; the four clips on that page (Header animations, Page scroll, Homepage header, Contact form) are the source of truth for the motion.
Design: Figma **Hi-Fi** page (`EGuNrOMhvZ2N2HhjafkEmp`, node `82:1261`). Node IDs below point at the layer each animation applies to.

Timings marked *(est.)* were measured from the reference clips by stepping through frames. Treat them as starting values and tune by eye.

---

## 1. Principles

1. **Things assemble, they don't just appear.** Headlines, collages and shapes start loose or scattered and settle into the composed layout from Figma. The Figma frame is the *end* state of every animation.
2. **Scroll drives the story.** Anything decorative (lines, starbursts, parallax, marquees) is tied to scroll position (scrubbed), not played once on a timer. Content (headings, copy, cards) plays once when it enters the viewport.
3. **One hand-drawn voice.** The thin doodle strokes are the connective tissue: they draw on as you scroll and point to the next thing to look at.
4. **Navy ↔ electric blue is our colour shift.** Happybase cycles pastels between sections; we alternate `--navy` and `--blue`, and the curved section edges are where the transition happens.
5. **Motion never blocks reading.** Content is readable within 600 ms of entering view. No scroll-jacking, no pinned sections longer than ~1 viewport.

---

## 2. Stack

| Need | Tool |
|---|---|
| Timelines, scroll triggers | GSAP 3 + ScrollTrigger |
| Word/line splitting | GSAP SplitText |
| Stroke drawing | GSAP DrawSVG (or manual `stroke-dashoffset`) |
| Smooth scroll | Lenis, synced to ScrollTrigger (`lenis.on('scroll', ScrollTrigger.update)`; drive Lenis from `gsap.ticker`) |
| React integration | `@gsap/react` → `useGSAP()` for scoped cleanup |
| Page transitions (Next.js) | Overlay component + router events, or the View Transitions API with the GSAP overlay as fallback |

All GSAP plugins listed are free to use.

---

## 3. Tokens

Define once and reuse everywhere. Don't hand-tune per element.

```css
:root {
  /* durations */
  --dur-micro: 200ms;   /* hovers, focus, toggles */
  --dur-small: 400ms;   /* buttons, chips, small reveals */
  --dur-medium: 800ms;  /* headings, cards, images */
  --dur-large: 1200ms;  /* hero assemble, page transition */

  /* easings */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);      /* GSAP: "expo.out"-ish → use "power4.out" */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);   /* GSAP: "power3.inOut" */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* GSAP: "back.out(1.6)" — buttons/stickers only */
}
```

| Token | Value |
|---|---|
| Word stagger | 0.06 s |
| Line stagger | 0.12 s |
| Card stagger | 0.1 s |
| Reveal offset (y) | 40 px (headings), 24 px (body), 60 px (cards) |
| Default ScrollTrigger start | `top 80%` |
| Scrub smoothing | `scrub: 1` (decorative), `scrub: true` (strokes) |

---

## 4. Reusable effects

Build these as named functions/hooks first; every section below is a combination of them.

### E1 · Headline assemble
*Ref: Header clip 0–2.5 s ("Devoting time / and attention"); Homepage header clip 0–3 s ("Focus on job satisfaction…").*

- Split heading into words.
- **From:** words spread apart (each line offset ±120–200 px on x, lines ~2× their final line-height apart), opacity 1.
- **To:** Figma layout (tight, offset block).
- Duration 1.6 s *(est.: spread at 0.5 s, settled by 2.5 s)*, `power4.out`, lines stagger 0.12 s.
- On load for the hero; on enter (`top 75%`) for section headings that use it.

### E2 · Line draw
*Ref: looping strokes in every clip, often ending in an arrow.*

- Applies to any doodle `vector` with a stroke.
- `drawSVG: "0%" → "100%"`, scrubbed between `top 85%` and `center 40%` of its section.
- Arrowheads: separate path, fade + scale from 0.6 → 1 in the last 10% of the draw.
- Stroke width stays fixed (`vector-effect: non-scaling-stroke`).

### E3 · Starburst rise
*Ref: radial burst rising out of a half-circle at the hero → next-section boundary (Header clip 2.5–5 s).*

- **From:** `yPercent: 60`, `scale: 0.6`, `rotate: -30°`.
- **To:** rest position, `scale: 1`, `rotate: 0`.
- Scrubbed across the section boundary (`top bottom` → `top 30%`).
- After settling: continuous slow spin, 1 revolution / 40 s, `ease: none`. Pause when off-screen.

### E4 · Tilted card parallax
*Ref: rotated photo cards around headlines (Header 11.5 s, Page scroll 0.5 s, 6.5 s).*

- Each card gets a `data-speed` between 0.85 and 1.2; `y` moves by `(1 - speed) * 200px` across the section's scroll.
- Rotation eases toward 0 by 30–50% while in view (e.g. `-8° → -4°`).
- Entry: `y: 60`, `opacity: 0` → rest, 0.8 s, `power4.out`, stagger 0.1 s.

### E5 · Name marquee
*Ref: "gr(o)wth" horizontal word with photo (Homepage header clip 9–12 s).*

- Infinite horizontal loop (duplicate the track; `xPercent: -50`, `ease: none`, ~30 s per loop).
- Scroll velocity changes speed and direction: `timeScale = clamp(1 + velocity/300, -4, 4)`, eased back to ±1 over 0.6 s.
- Top and bottom marquees move in **opposite** directions.

### E6 · Curved edge colour handoff
*Ref: section background colour changing and text changing colour across the boundary (Homepage header clip 6 s, "development").*

- Section edges are curved SVG/`clip-path` shapes (Figma: curved top of Projects, `Rectangle 6`, `Rectangle 10`).
- The curve's control point is scrubbed: it bulges ~80 px while the edge crosses the viewport and flattens as it reaches the top (`top bottom` → `top top`).
- Text that sits across a boundary is rendered twice (navy-on-blue / blue-on-navy) and split with matching `clip-path`, so the colour flips exactly at the edge.

### E7 · Content reveal (default)

- Headings: lines masked (`overflow: hidden` wrapper), `yPercent: 100 → 0`, 0.8 s, `power4.out`, stagger 0.12 s.
- The underline highlight behind headings (Figma `Frame 159` under each title) wipes in after the text: `scaleX: 0 → 1`, origin left, 0.5 s, 0.2 s delay.
- Body copy: `y: 24`, `opacity: 0 → 1`, 0.6 s, once.

### E8 · Circle expand transition
*Ref: Header clip 10.3–15 s (full-colour screen + centred logo loader). Figma: `Page Transition` section `350:12239`.*

- **Out:** small dot (`Rectangle 76`, 32 px, centre) scales to cover the viewport (Figma end size 2542 px → `scale ≈ 80`), 0.7 s, `power3.inOut`, colour `--blue`.
- **Hold:** 150–300 ms max (only while the next route loads). Optional: logo mark fades in at centre.
- **In:** covering circle shrinks toward the destination's first heading, or simply fades out, 0.6 s. Then the next page's E1 runs.
- First visit loader = same overlay, starting already covered.

### E9 · Magnetic pill
*Ref: floating "Let's talk" pill.*

- Buttons follow the cursor up to 12 px within a 1.5× hit area, `power3.out` 0.4 s; return on leave with `elastic.out(1, 0.4)`.
- Arrow icons slide out right and back in from the left on hover (0.35 s).

---

## 5. Sections

### 5.1 Navbar — `348:12185` (instance), states `314:261` Close / `314:260` Open
- On scroll down past 100 px: hide (`yPercent: -100`, 0.4 s). On scroll up: show.
- **Open:** slanted blue panel (`Rectangle 75`) wipes down from the top with its angled edge leading: `clipPath` from `polygon(0 0,100% 0,100% 0,0 0)` to final, 0.7 s, `power4.inOut`.
- Menu items (`Frame 138`: Home / Experiences / Contact) rise in with E7 masking, stagger 0.08 s, starting at 0.3 s. Icons pop with `back.out`.
- "Get in touch" block fades in last (0.5 s delay).
- **Close:** reverse at 0.8× duration. Lock body scroll (Lenis `stop()`) while open.

### 5.2 Hero — `186:1436`
Load timeline (after the loader clears):

| t (s) | What | Layer |
|---|---|---|
| 0.0 | Headline assembles (E1) | `188:1989` "Need a Freelance Full-stack Developer?" |
| 0.3 | Underline under "Full-stack" draws in (E2, timed 0.6 s, not scrubbed) | stroke under headline |
| 0.5 | Photo collage drops in: each photo from `y: -80`, rotated +15° extra, `back.out(1.4)`, stagger 0.12 s | `186:1942` → `Group 2`, `Group 10`, `Group 11` |
| 0.9 | Small doodles (sparkle ticks, short arrows) pop: `scale 0 → 1`, `back.out(2)`, stagger 0.05 s | `Vector 18–21`, `Vector 26`, `Vector 10` |
| 1.0 | Navbar fades down | `348:12185` |

On scroll:
- Big swoosh lines draw (E2) as the hero scrolls out | `186:1437` Vector 1, `190:2212` Vector 22, `188:1988`.
- Collage parallax (E4), photos separating slightly (spread ±20 px) as you scroll away.
- Starburst at the bottom edge rises into Projects (E3) | `190:2264`.

### 5.3 Projects — `193:2317`
- Curved top edge (E6): navy hero → blue Projects.
- Second starburst / ring sits on the boundary and rotates with scroll (E3 spin only) | `193:2320`, `193:2333`.
- Heading "Projects" + underline (E7) | `251:3000`; subtitle body reveal | `199:2997`.
- Project cards (`199:3060`, 4× `WF Image Placeholder`):
  - Entry: E4 entry with stagger in reading order (top-left, top-right, bottom-left, bottom-right).
  - The device mockup inside each card has a slower parallax than the card (`y` ±40 px), so it looks like it's floating.
  - Hover: card lifts `y: -8`, mockup scales 1.04, cursor becomes a "View" pill (E9 style), 0.4 s.

### 5.4 About — `229:180`
- Top and bottom name marquees (E5), opposite directions | `275:3242`, `275:3226`. The outlined/filled "Novel Bafagih" alternation stays as designed.
- Divider lines draw left → right on enter (scaleX, 0.8 s) | `558:100`, `558:101`.
- Heading + underline (E7) | `275:3224`.
- Portrait card: E4 (tilt eases −4° → 0°), the small chip sticker on it pops in late with `back.out` | `232:192`, `234:1435`.
- Bracket doodles around the copy draw in (E2).
- Body copy: line-by-line reveal (E7), stagger 0.08 s | `275:3223`.

### 5.5 Core Values — `275:3118`
- Heading (E7) | `275:3120`, `275:3119`.
- Grid cards (`450:661` row 1, `450:701` row 2): entry stagger 0.1 s, `y: 60`.
- Each card's illustration plays a small one-off motion on enter:
  - **Fast:** icon slides in from the left with motion blur (skewX −15° → 0).
  - **Reliable:** icon scales from 0.8 with `back.out`.
  - **Flexible:** wave path morphs/oscillates (subtle `y` sine on the path, 4 s loop).
  - **Low Cost:** zig-zag arrow draws on (E2, timed).
  - **Problem Solver:** icon rotates 90° into place.
- Hover: the card border brightens, the illustration repeats its motion at 0.6× duration.

### 5.6 More Detail CTA — `245:2581`
- Curved band (`Rectangle 6`) uses E6: the curve flattens as it scrolls in.
- Copy reveals (E7); the round arrow button is magnetic (E9) | `245:2662`.
- Line under the section draws (`249:2681`).

### 5.7 Testimonials — `249:2682`
- Heading block from left, card from right, 0.8 s, meeting at the same time | `251:3005`, `251:2963`.
- If there are multiple testimonials: stacked cards; next card slides in from the right with a −3° tilt that settles to 0°; auto-advance every 6 s, paused on hover. Quote text uses the line reveal (E7).

### 5.8 "Interested working with me?" + Talk wall — `275:3116`
*Ref: Contact clip 7 s (stacked big text "Request demo / Get in contact / Chat with a coach").*
- Heading + copy (E7) | `285:4207`.
- **Talk wall** (`285:4205`, 3 rows): each row is a marquee (E5 logic) with alternating direction; row 2 moves 1.3× faster. Scroll velocity changes speed.
- As the section centres, the outline "Talk" rows dim to 30% opacity and the **Let's Talk** button scales 0.9 → 1 with `back.out` | `281:3722`.
- Button: magnetic (E9). Click → E8 transition into Contact.

### 5.9 Footer — `270:3045`
- Blue block (`Rectangle 39`) wipes up from the bottom (clip-path), 0.8 s, when the footer enters.
- Logo + links fade up, stagger 0.05 s.

---

## 6. Other screens

### 6.1 Experiences — `317:462`
- Page enters via E8. Name heading uses E1 (assemble) | `317:814`.
- Portrait card drops in with tilt (E4 entry) | `317:802`; corner doodles (`Group 141`, `Group 18`) draw/pop after.
- Resume button and social buttons pop in, stagger 0.06 s, `back.out` | `317:3639`, `318:3689`.
- Curved divider into the blue body (`Rectangle 10`, `336:12056`) uses E6.
- "About" / "Experiences" headings (E7). Education / Leadership / Professional columns: column titles first, then entries line by line, stagger 0.1 s | `348:12153`.

### 6.2 Contact — Choose Service `281:3615` → Final Step `281:3763`
*Ref: Contact clip 7–16.6 s (angled panel slides up, step counter in a flower shape, one field group per step).*
- Enters via E8.
- **Choose Service:** title (E7), then the Design / Web / Mobile cards pop in (stagger 0.1 s, `back.out(1.4)`), "Others" bar wipes in from the left | `281:3617`, `281:3743`.
  - Card hover: illustration tilts −6°, card lifts 6 px.
  - Select: card fills/outlines, others dim to 50%, arrow button (`281:3749`) becomes active with a spring scale.
- **Step change:** the current step slides out left + fades (0.4 s); next step slides in from the right (0.6 s, `power4.out`). Optional: an angled panel sweeps up between steps like the reference.
- Add a **step counter** (`1/2 → 2/2`) next to the big arrow button; the number rolls vertically on change (masked `yPercent` swap).
- **Final Step fields** (`304:19`): on focus the underline animates `scaleX 0 → 1` in `--blue`; the label floats up 0.2 s.
- **Submit:** the big arrow button (`285:4209` area) stretches into a full-width bar, then E8 covers the screen and a "Thanks" state assembles (E1).

---

## 7. Reduced motion & accessibility

When `prefers-reduced-motion: reduce`:
- Disable: E1 spread, E3 spin, E4 parallax, E5 marquee movement, E6 curve bulge, Lenis smooth scroll.
- Keep: opacity fades ≤ 200 ms, E8 replaced by a 200 ms cross-fade, strokes shown fully drawn.
- Marquees still show their text (static, centred).
- All content is in the DOM and readable without JS; animations start from `gsap.set` *after* hydration so there is no flash of hidden content.
- Focus states never rely on motion alone.

## 8. Responsive

The Figma is desktop (1440) only. Below 768 px:
- E1 spread distance halved; collage becomes a single stacked cluster.
- E4 parallax off (keep the tilt + entry).
- E5 marquees keep running, 0.7× speed.
- Line draws stay, but long swooshes (`Vector 1`, `Vector 22`) are hidden or replaced with shorter ones.
- Navbar open panel goes full screen; the angled edge stays.

## 9. Performance

- Animate only `transform`, `opacity`, `clip-path`, and SVG `stroke-dashoffset`.
- `will-change` only during active tweens (GSAP handles this via `force3D`).
- Kill/revert every ScrollTrigger on route change (`useGSAP` scope / `ctx.revert()`), then `ScrollTrigger.refresh()` after images load.
- Pause infinite loops (marquees, spins) when off-screen with an `IntersectionObserver` or ScrollTrigger `onToggle`.
- Target: no long tasks > 50 ms during scroll; 60 fps on a mid-range laptop.

## 10. Build order

1. Lenis + GSAP setup, tokens, reduced-motion guard.
2. E7 (default reveal) — gets every section looking alive quickly.
3. Hero: E1 + collage + E2.
4. E8 page transition + Navbar open/close.
5. E5 marquees (About, Talk wall).
6. E3 starbursts + E6 curved edges.
7. E4 parallax, Core Values micro-motions, Projects hover.
8. Contact flow.
9. Reduced motion + mobile pass, performance pass.
