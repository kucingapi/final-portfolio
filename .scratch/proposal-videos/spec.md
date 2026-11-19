# Proposal videos

Status: ready-for-agent

Novel records short videos for one client, uploads them to YouTube as unlisted, and sends them on that client's **tailored link**. He wants to see how the client watched: whether they pressed play, how much they watched, where they dropped off, what they skipped or rewatched. Vocabulary is in `GLOSSARY.md` (**Tailored link**, **Rate card**, **Proposal**, **Proposal video**, **Viewing**).

Settled in a grilling session on 2026-11-19. Model it on the rate card: a tailored link made with `rates` gets the `/rates` page; a tailored link made with a proposal gets a `/proposal` page.

## What Novel does

1. Uploads each video to YouTube as **unlisted**.
2. Calls the MCP `save_cv_variant` (new optional field, e.g. `proposal`) with:
   - `videos`: one or more `{ url, title }`, in order (any YouTube URL form: `watch?v=`, `youtu.be/`, `shorts/`, `embed/`; store the video id, reject anything that isn't YouTube)
   - `note`: optional short text from him
3. Sends the link. Nothing else to set up per client.

The proposal is stored on the tailored link, in the store links and rate cards already use. Only the URLs and text are stored, never the videos.

## What the client sees

- A tailored link with a proposal **opens straight on `/proposal`** (keeping `?v=`), with the normal navbar so they can wander into projects and CV. Without a proposal, `/proposal` shows a short note, like `/rates` does.
- The page is `noindex` and not in the navbar.
- One or more titled videos in order ("1. The problem", "2. My approach"...), Novel's note, then one button:
  - goes to the **rate card** when the link has `rates`
  - otherwise goes to the **contact page**, with the enquiry tagged with the proposal / link code so Novel knows where it came from
- Page wording (headings, button, "video 2 of 3") follows the link's language (`lang: "id"` → Bahasa via `src/lib/i18n/ui`). Novel's titles and note are shown exactly as typed.
- The design follows the site's existing look (see `PRODUCT.md`, `MOTION_SPEC.md`, `DASHBOARD.md` and the rates page).

## Watch tracking

- Use YouTube's **IFrame Player API** script in the browser (`https://www.youtube.com/iframe_api`). No YouTube Data API, no Google key, no server call to YouTube.
- PostHog replay cannot see inside the YouTube iframe, so the data comes from player events.
- Track per video, per **viewing**: played or not, seconds actually watched, furthest point, where they dropped off, ranges skipped and rewatched, reached the end. A viewing runs from the first play to leaving the page.
- Send to **PostHog only**, through the existing client (`loadAnalytics` in `src/lib/analytics.ts`, `/relay`, events already carry `v_code`): play, pause, seek, end, and **progress every ~15 s while playing**, plus on page hide (`visibilitychange`/`pagehide`), so a closed tab loses at most ~15 s.
- **Store no watch data on Novel's server** (nothing new in Redis / `.data/`). Not an analytics table, not counters.
- Novel's own browser (`nb_test` / `?test=1`) sends nothing, same as today.

## Pings and feed

- The server **forwards** two activity events and keeps no watch data beyond the feed line itself (the existing `dash:events` list, capped at 300):
  - first play of a viewing: "Acme started your proposal"
  - one summary per viewing when it ends (last video ended, or page hidden): "Acme: watched 2 of 3 videos, 6:10 of 9:30, left during video 3 at 1:12"
- New `ActivityKind`(s) in `src/lib/dashboard/activity.ts`, with a push preference and title, carrying the visit's PostHog `session`/`person` so the feed links to the replay (as the other kinds do). Respect the existing quiet period and the `nb_test` / link-preview exclusions.

## Dashboard

- On the tailored link's row/sheet (`src/components/dashboard/LinkSheet.tsx`), show the proposal's watch data: per viewing, per video (watched / furthest / dropped at / skipped / rewatched / finished), each viewing with a button to its PostHog replay.
- Read it **from PostHog when the dashboard opens** (HogQL query API, filtered by the link's `v_code`). This needs a PostHog **personal API key** on the server, which the site doesn't have yet: add an env var (e.g. `POSTHOG_PERSONAL_API_KEY`, alongside the existing `NEXT_PUBLIC_POSTHOG_PROJECT_ID`) to `.env.example`, and have the panel say clearly when it's missing. Novel sets the real key on Vercel himself.
- The MCP's link details (`get_cv_variant` / `list_cv_variants`) could return the same summary; nice to have.

## Out of scope

- Google Drive or self-hosted video.
- A shared library of videos reused across clients (each proposal is recorded for one client).
- Storing watch data in Redis.

## Done when

- A tailored link saved with a proposal opens on `/proposal`, plays the videos, and its button goes to the rate card or the tagged contact form.
- Watching produces PostHog events with `v_code`, the two feed events/pings arrive, and nothing about watching is written to the store.
- The dashboard shows each viewing per video with replay links (or a clear "add the PostHog personal key" message).
- Works in English and Bahasa, on mobile and desktop; `npm run lint` and the type check pass. Don't run `next build` while `next dev` is running.
