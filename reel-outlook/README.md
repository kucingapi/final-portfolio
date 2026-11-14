# Outlook outage reel (TikTok / Reels)

Audience: business users. Fully animated and faceless: one animated scene per sentence, AI voiceover,
headlines that animate in word by word, and burned-in captions.

## Finished videos (ready to upload)

- `en/outlook-reel-en.mp4` (58s)
- `id/outlook-reel-id.mp4` (62s)

1080x1920, 30fps. Voice: OpenRouter `openai/gpt-audio-mini` ("sage"); English slowed 4%.

## Scenes

| # | Sentence (EN) | Animation |
|---|---|---|
| 1 | Outlook was down for about a day. | Inbox emails slide away, spinner, clock racing |
| 2 | And it wasn't a hack. | Padlock drops in, shield, green check |
| 3 | On November 12, ... dropped offline. | Calendar flips to 12, servers scanned, three fail |
| 4 | The rest got overloaded and failed too. | Traffic pours in, load bars go red, servers shake and fail |
| 5 | Outlook and Teams went down around the world. | Spinning globe with red outage pings, app tiles with X |
| 6 | Microsoft hasn't published the full cause yet. | Magnifying glass over a redacted report, question mark |
| 7 | Next time, check Microsoft's status page first. | Cursor clicks refresh on a status page |
| 8 | Expect late emails. | Envelope crawling along a path, hourglass |
| 9 | Move anything urgent to a call or WhatsApp. | Ringing phone, chat bubbles pop up |
| 10 | Should you switch to Google? | Box hops between two clouds |
| 11 | You can, but Google goes down too, and moving a company is expensive. | Cloud fails, coin stack grows |
| 12 | A backup plan costs far less. | Scale tips: coins heavy, shield light |
| 13 | You can't stop Microsoft from breaking, but you can keep your business running. | Storm cloud above, office lights and conveyor keep going |
| 14 | Pick a second channel, keep key contacts offline, and practise it once. | Checklist ticks as each item is spoken |
| 15 | What did your office do when Outlook went down? | Comment bubbles stream up, arrow to comments |

## Other files (per language)

| File | Use |
|---|---|
| `voiceover-*.wav` | Voice track alone, e.g. to add music in CapCut |
| `captions-*.srt` | Captions timed to the voiceover |
| `script-*.txt` | Each sentence with its start time |

To regenerate: `python3 tools/render_animated.py reel-outlook [en] [id]`. Needs the OpenRouter key;
voice clips are cached per sentence in `*/audio/`, so only changed sentences are re-voiced.

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
