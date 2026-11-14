# Reel style

How the Outlook reel is put together, so the next short-form video looks like the portfolio and like this one.
The site's own sources are the authority: colours and type in `src/app/globals.css`, components in
`src/components/ui.tsx`, decor in `public/figma/`, motion in `MOTION_SPEC.md`.

## Format

- Vertical 1080x1920, 30fps, about 60 seconds, faceless.
- One animated scene per spoken sentence. Sentences are grouped into beats (here: the outage, what happened,
  what to do, should you switch, next time, your turn), and each beat is one section colour.
- English and Indonesian versions, recorded separately. Indonesian stays casual for TikTok ("kamu", "nggak"),
  unlike the site's "Anda".

## Colour

| Token | Hex | Use |
|---|---|---|
| midnight-950 | `#010326` | Navy sections, text on light cards |
| midnight-900 | `#0411ab` | Blue sections |
| midnight-500 | `#1b3cff` | Discs, buttons, starburst on blue, healthy states |
| midnight-400 | `#4571ff` | Highlight bar, numbers ("01") |
| midnight-100 / 50 | `#d0e3ff` / `#e5f0ff` | Cards and their insides |
| chip-teal / chip-olive | `#0e3044` / `#705801` | Status chips; olive means "down", there is no red |

Beats alternate navy and blue. The next section sweeps up over the last one with a curved top edge that flattens
as it arrives (MOTION_SPEC E6).

## Type

- Headlines: Cabin bold, 112px, white, two or three keywords at most. The key phrase gets the hand-drawn
  underline on navy and the asymmetric highlight bar on blue.
- Numbers and figures: Chillax ("01", "12", "24h", "$$$$").
- Chips: Inter bold in pills (white, teal or olive with a white border, or electric blue).
- Captions: Cabin bold 62px, centred under the scene, never repeating the headline word for word.

## Components

- The logo and a section chip at the top, like the site's navbar.
- Light-blue rounded cards (64px radius), tilted photo-style cards with a light border, blue discs.
- Hand-drawn white strokes from `public/figma/hero/` (underline, arrow, sparks, ticks, swoosh) and the starburst.
- Icons are drawn as white or navy strokes, never brand logos. Product names appear only as text.

## Motion (MOTION_SPEC.md)

- Headlines: masked line reveal (E7), the highlight or underline wiping in after the text. The opening headline
  uses the hero's assemble (E1), but starts almost settled so it reads on frame one.
- Strokes draw on (E2). The starburst rises and then spins slowly (E3). Cards rise with power4.out, chips pop with
  back.out(1.6). The "keep running" beat uses two marquees in opposite directions (E5).
- Nothing loops out before its scene ends. Scenes change on the sentence, with the old content leaving upward.

## Layout and safe zones

- Header from y 160, headline from y 330, scene area from y 684 (scaled to 86%), captions from y 1306.
- Keep content out of TikTok's right button rail (x > 930, y 880 to 1620), the top bar (y < 150) and the bottom
  description area (y > 1500). Decoration may pass through; text and anything the eye must follow may not.
- The hook (headline, its picture and the key number) is fully visible on the first frame.

## Voice

- OpenRouter `openai/gpt-audio-mini`, voice "ash" (male), natural pace (about 130 to 140 words per minute).
- One clip per sentence, checked against the script and retried if the model paraphrases or answers a question.
- Silence is trimmed from each clip, with short pauses between sentences and longer ones between beats.

## Pipeline

`tools/render_web.py` voices each sentence (cached), builds the timeline and captions, then `tools/record.cjs`
seeks the GSAP timeline in `tools/web/reel.html` frame by frame in headless Chromium and encodes with ffmpeg.
A new reel means a new script, new headlines and new scene functions in `reel.js`; everything else carries over.
