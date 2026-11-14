# Outlook outage reel (TikTok / Reels)

Audience: business users. Fully animated and faceless, in the portfolio's visual language: navy and
electric-blue sections that hand over on a curved edge, Cabin headlines with the hand-drawn underline
(navy) or the highlight bar (blue), white / teal / olive chips, light-blue cards, the starburst, doodles
and swoosh from `public/figma/`, and motion from `MOTION_SPEC.md` (headline assemble, line reveals,
line draw, starburst rise, opposite marquees).

## Finished videos (ready to upload)

- `en/outlook-reel-en.mp4` (62s)
- `id/outlook-reel-id.mp4` (61s)

1080x1920, 30fps, captions burned in. Voice: OpenRouter `openai/gpt-audio-mini` ("ash", male), natural pace.

## How it is made

- `tools/web/reel.html` + `reel.js`: the reel as a web page, one GSAP timeline, one scene per sentence.
- `tools/record.cjs`: seeks the timeline frame by frame in headless Chromium and encodes with ffmpeg.
- `tools/render_web.py`: voiceover and timing (via `render_animated.py`, which caches a clip per sentence), then records.

Regenerate: from the repo root run `npm ci`, put the fonts in `tools/web/fonts/` (Cabin variable as `Cabin.woff2`,
`Inter-700.woff2`, `Chillax-600.woff2`, `Chillax-700.woff2`, from Google Fonts and Fontshare), then
`python3 reel-outlook/tools/render_web.py reel-outlook [en] [id]`. New sentences need the OpenRouter key.

## Other files (per language)

| File | Use |
|---|---|
| `voiceover-*.wav` | Voice track alone, e.g. to add music in CapCut |
| `captions-*.srt` | Captions timed to the voiceover |
| `script-*.txt` | Each sentence with its start time |

## Post copy

- EN caption: Outlook went down for a day. Here's what happened and what your business should do next time.
- ID caption: Outlook mati seharian. Ini yang terjadi dan apa yang harus disiapkan bisnis kamu.
- Hashtags (EN): #Outlook #Microsoft365 #MicrosoftOutage #BusinessTips
- Hashtags (ID): #OutlookDown #Microsoft365 #TipsBisnis #Teknologi
- Post the two versions on separate days.

## Check before recording

- Cause: Microsoft says servers failed automated health checks and the rest were overloaded; no full root cause yet.
  If the post-incident report is out, update the "what happened" line.
- Duration is kept as "about a day" because sources disagree (24-48 hours).
- "70+ countries" was replaced with "worldwide" because it came from a single report.
- The migration beat is opinion, not reporting.
