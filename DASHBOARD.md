# Freelance dashboard: decisions

A private page on the portfolio for Novel only: short links with click analytics, every tailored CV link in the
same list, and each project exported in the shape Upwork and Contra ask for. Decided 2026-11-03.

## Access

- **Authenticator code only** (TOTP, RFC 6238: 6 digits, 30 s step, SHA-1, so Google Authenticator, 1Password and
  Authy all work). The secret lives in an env var (`DASHBOARD_TOTP_SECRET`); there are no users or passwords.
- A one-time setup page shows the QR code while no secret is set, and only on localhost.
- **Rate limiting** in Upstash, because a 6-digit code alone can be brute-forced: 5 wrong codes lock sign-in for
  15 minutes, and a code that worked once is refused if it is used again in the same window.
- **Session: 7 days on that device.** An httpOnly, Secure, SameSite=Strict cookie, signed with a key derived from the
  TOTP secret, so replacing the secret signs every device out. There is also a sign-out button.
- **Lost phone:** generate a new secret, put it in Vercel's env, and redeploy. No recovery codes.
- The dashboard is `noindex` and is left out of the sitemap. Its API routes check the session cookie on every call.

## Short links

- **Shape: `novelbafagih.com/go/<name>`.** The name is free text (lowercase letters, digits, dashes). Left blank, it
  gets a random 8-character code from the same alphabet as the CV codes. Each link stores a destination URL, a
  name and a private note, and can be edited (to change the destination) or deleted later.
- **Per click:** a total count, plus a log of the most recent clicks (time, country from Vercel's geo header,
  referrer host, device class) and a clicks-per-day chart.
- **Link previews are ignored entirely**: requests from crawlers (WhatsApp, Slack, LinkedIn, Discord, Telegram,
  Twitter, Facebook, Upwork's unfurler, and generic bot user agents) are redirected but not recorded.
- **Novel's own clicks are not counted**: the existing `nb_test` cookie (`?test=1`) applies here too.
- The redirect is a 302, so browsers don't cache it and a changed destination takes effect straight away.

## Tailored CV links

- They appear in the same list as short links, with their existing opens, CV downloads and portfolio downloads
  (`getActivity` in `src/lib/cv/store.ts`). The dashboard only shows them; creating and editing still happens
  through the `novel-cv` MCP.

## Project export (Upwork and Contra)

Neither platform can import a file, so the export is copy-ready fields plus the images.

- **Text is generated, read-only**, from `src/content/projects.ts` on each view. To change the wording, edit the
  project or the export rules. Each field shows its length against the limit.
- **Upwork:** title (≤ 70), your role (≤ 100), description (≤ 600), up to 5 skills (taken from `stack`), media.
  Upwork's own pages disagree (the help center says 70/100/600, the portfolio guide says 40/≤300), so check the
  live form once and record the real limits here.
- **Contra:** title, short description, cover image, images, tools (from `stack`), up to 3 roles, duration
  (`period`), link (the `/projects/<slug>` page). Contra's "Portfolio Magic" can also build a project from a pasted
  URL, so the case-study link is offered as well.
- **Images: one zip per project** with the cover first (the art's `real` render, or `cover`), then the chapter
  shots, numbered in page order.

## Open

- `novelbafagih.com` is not referenced anywhere in the repo yet; the site and docs use `novelb.vercel.app`. Before
  building: is the domain owned and attached to the Vercel project? Until it is, links work as
  `novelb.vercel.app/go/<name>`, and switching the domain needs no code change (`NEXT_PUBLIC_SITE_URL`).
- The live Upwork limits (see above): once checked, set them in `UPWORK` in `src/lib/dashboard/export.ts`.

## How it was built

| What | Where |
|---|---|
| Page and sign-in gate | `src/app/dashboard/page.tsx`, `src/components/dashboard/*` |
| One-time setup (QR code) | `src/app/dashboard/setup/page.tsx` |
| TOTP, session cookie, rate limit and replay | `src/lib/dashboard/totp.ts`, `src/lib/dashboard/auth.ts` |
| Sign in and out | `POST` / `DELETE /api/dashboard/session` |
| Short links and their clicks | `src/lib/dashboard/links.ts`, `/api/dashboard/links`, `/api/dashboard/links/<name>` |
| The redirect | `src/app/go/[name]/route.ts`; previews are told apart in `src/lib/dashboard/visitor.ts` |
| Project export | `src/lib/dashboard/export.ts`; images zip at `/api/dashboard/projects/<slug>` |
| Shared Redis client (also used by the CV store) | `src/lib/kv.ts` |

Choices made while building, which the decisions above left open:

- **Rate limit scope:** the lock is global, not per IP, as there is one person to let in and an attacker can change
  IPs. The flip side is that someone guessing codes can keep sign-in locked; the phone code still works once the
  lock lifts. Replay is refused per 30-second step, and any code older than the last one used is refused too.
- **Drift:** a code is accepted for one step either side of now (±30 s), for a phone clock that is slightly off.
- **SameSite=Strict:** opening `/dashboard` from a link on another site doesn't send the cookie on that first load,
  so the sign-in form checks the session with a same-site request and loads the dashboard if it is still valid.
- **Unknown short link:** `/go/<unknown>` redirects to the home page rather than showing a 404, so a mistyped link
  still lands somewhere useful.
- **Destinations** may be a full http(s) URL or a path on this site (`/projects/agentflow`), which follows the
  domain when `NEXT_PUBLIC_SITE_URL` changes.
- **Clicks log:** the 200 most recent per link. The total and the per-day counts (Jakarta days) cover all time.
- **Not counted:** link previews and bots (by user agent and Next's `isBot`), empty user agents, `HEAD` requests,
  browser prefetches (`Sec-Purpose: prefetch`), and the `nb_test` browser.
- **Export text rules:** the Upwork and Contra title is `<title>: <kind>` unless the title already says the kind;
  the description is the summary plus the first "my part" paragraph when it fits in 600, or else the summary;
  roles are the part of `role` before the first comma, split on "and" (overrides for SIDAKU and Breel).
- **Images** are re-encoded from the site's WebP to JPEG (quality 88, up to 2400 px), on the site's dark background
  where a render has transparent corners. Payroll Formatter has no images yet, so it has no zip.

## Sources

- Upwork portfolio fields: https://support.upwork.com/hc/en-us/articles/360016144974 and
  https://www.upwork.com/resources/portfolio-guide
- Contra projects: https://help.contra.com/en/articles/9322393-creating-projects-on-contra and
  https://contra.com/blog/guide-to-projects
