# Outlook outage reel (TikTok / Reels)

Audience: business users. Faceless: AI voiceover with animated graphics and burned-in captions.
English is about 57s, Indonesian about 60s.

## Finished videos (ready to upload)

- `en/outlook-reel-en.mp4`
- `id/outlook-reel-id.mp4`

1080x1920, 30fps, captions burned in. Voice: OpenRouter `openai/gpt-audio-mini` ("sage"); English slowed 8% to about 142 words per minute.

## Other files (per language: `en/` and `id/`)

| File | Use |
|---|---|
| `voiceover-*.wav` | Voice track alone, if you re-edit in CapCut and add music |
| `captions-*.srt` | Captions timed to the voiceover (for TikTok's own caption tool, or re-editing) |
| `script-*.txt` | The script text |
| `overlays/*.png` | The on-screen text cards as transparent PNGs |

To regenerate: `python3 tools/render_faceless.py reel-outlook` (needs the OpenRouter key; add `--reuse-audio` to keep the existing voice clips).

Overlays sit in the upper third, clear of TikTok's right-side buttons and bottom caption area.
List beats have one PNG per item (`-1`, `-2`, `-3`); switch to the next one when you say that item.

## Beats

| Time (EN) | Beat | Overlay |
|---|---|---|
| 0-5s | Hook | Not a hack. |
| 5-20s | What happened | Nov 12 · Worldwide |
| 20-32s | What to do | 1. Status page · 2. Late emails · 3. Call or WhatsApp |
| 32-44s | Migrate? | Switch to Google? |
| 44-55s | Avoid it next time | Second channel · Offline contacts · Practise once |
| 55-60s | Closer | What did your office do? |

Times in the table were the plan; the videos follow the real voiceover length.

## Visuals per beat

Hook: email with a red X · What happened: a grid of servers failing one after another · What to do: phone and chat bubble ·
Migrate: two clouds that both fail, then a green shield (backup plan) · Avoid it: checklist ticking as each item is spoken ·
Closer: comment bubble and an arrow pointing to the comments.

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
