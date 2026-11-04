# Freelance dashboard: decisions

A private page on the portfolio for Novel only: short links with click analytics, every tailored CV link in the
same list, and each project exported in the shape Upwork and Contra ask for. Decided 2026-11-03; on the same day,
setup moved to the live site, and the dashboard became a phone app with notifications and a new UI. On 2026-11-04
it gained Content: the site's copy, the master CV and the projects became editable there and by agents over MCP.

## Access

- **Authenticator code only** (TOTP, RFC 6238: 6 digits, 30 s step, SHA-1, so Google Authenticator, 1Password,
  Apple Passwords and Authy all work). There are no users or passwords. The secret is made by the setup page and kept
  in Upstash; `DASHBOARD_TOTP_SECRET`, when set, fixes it instead and the setup page refuses to replace it.
- **Setup happens on the live site, through an emailed link.** While no secret exists, `/dashboard` offers to email a
  one-time link (15 minutes, works once) to the contact form's inbox (`CONTACT_TO_EMAIL`, else `site.email`) through
  Resend, with the same key as the contact form. Anyone can ask; only the inbox gets the link. At most 5 links an hour.
- **The link's page shows nothing secret until "Continue" is tapped**, because mail scanners open links to check them.
  Then it shows an "Add to authenticator app" button on a phone (`otpauth://`), the QR code on a computer, and the key
  to type. The first 6-digit code from the app confirms it; only then does the new secret replace the old one.
- **The emailed address never comes from the request.** A forged Host or X-Forwarded-Host could aim the link at
  another site and hand it the token, so production uses `NEXT_PUBLIC_SITE_URL` (else `VERCEL_PROJECT_PRODUCTION_URL`),
  a preview its own `VERCEL_BRANCH_URL`, and only local development the request's origin. Tokens are stored hashed.
- **Rate limiting** in Upstash, because a 6-digit code alone can be brute-forced: 5 wrong codes lock sign-in (and
  setup) for 15 minutes, and a code that worked once is refused if it is used again in the same window.
- **Session: a week after the last visit.** An httpOnly, Secure, SameSite=Strict cookie, signed with a key derived
  from the TOTP secret, so replacing the secret signs every device out. Opening the dashboard renews it.
- **Lost phone:** "Lost your phone?" on the sign-in screen, or Settings → "Email a reset link", sends the same kind of
  link. Finishing it replaces the secret and signs out every device. No recovery codes.
- The dashboard is `noindex`, left out of the sitemap and out of PostHog (its links carry a token). Its API routes
  check the session cookie on every call.

## On the phone: an app with notifications

- **Installable.** `/dashboard` links its own manifest (opens at `/dashboard`, full screen, the N and full stop on
  midnight as its icon). The site's pages have none, so only the dashboard installs. On iPhone: Safari → Share → Add to
  Home Screen. The installed app keeps its own cookies, so it signs in once on its own.
- **Notifications** (Web Push): a short-link click, a tailored CV link opened, a CV or portfolio PDF downloaded. Each
  kind can be switched off in Settings, each device turned off, and a test sent. One ping per link a minute at most;
  the feed still gets every event. Link previews, bots and the `nb_test` browser never ping. iPhone needs iOS 16.4 or
  later and the Home Screen app; Chrome, Edge, Firefox and Safari on a computer work in the browser.
- **Nothing to configure:** the VAPID keys are made on first use and kept in Upstash, beside the devices and switches.
- **Activity feed:** the 300 most recent events across all links, grouped by day, newest first. A notification opens
  the link it is about (`/dashboard?link=go:<name>`).

## The interface

- Its own app shell, without the portfolio's navbar, page transition, smooth scroll or analytics: the site's chrome
  lives in `src/app/(site)/layout.tsx` (a route group, so no URL changed) and the dashboard sits outside it.
- A tab bar on a phone (Activity, Links, Projects, Settings), a sidebar from 1024 px. A link opens in a panel that
  rises from the bottom on a phone (drag it down to close) and slides in from the right on a computer.
- The site's world (midnight palette, Cabin), on shadcn-style components (Radix, `cva`, lucide icons, sonner) in
  `src/components/dashboard/ui`. Their colour names and a plain rem scale apply only on dashboard pages, through
  `html:has(.dash)` in `globals.css`, so the site's design-pixel canvas is untouched.

## Content: the site's own CMS

Chosen over a hosted CMS (Sanity) and one inside the app (Payload): the dashboard, the store and the MCP endpoint were
already here, every CMS's admin is a separate app with its own login, and Payload's admin breaks under Cache
Components until its version 4.

- **Three documents** under Content: Projects (every case study, in the site's order), CV (the master CV that tailored
  links pick from) and Site (the basics, About, How I work, testimonials, the Freelance and Full-time copy, and both
  career lists).
- **Drafts, then Publish.** Saving writes a draft that only the dashboard sees. Publish puts it on the site and
  expires that document's cache tag, so the next visit renders it. Preview opens the site with the drafts showing
  (Next's Draft Mode) and a "Showing drafts · Exit" pill.
- **Pages stay prerendered.** Pages, the PDFs and the MCP read content through cached functions, tagged per document
  with the longest lifetime (`src/lib/content/read.ts`), so publishing is the only thing that re-renders them.
- **The code's copy until the first publish.** `src/content/*.ts` are the defaults. Once a document is published,
  the stored copy wins. Earlier versions keeps the last 20 publishes and the shipped copy, each restorable as a draft.
- **Agents edit drafts only**, with the MCP tools `get_content`, `edit_content` (RFC 6902 JSON Patch) and
  `content_changes`, on the same bearer token as the CV tools. Each write names the revision it started from, and a
  stale one is refused. A draft an agent wrote says so, with its changes listed. Only the dashboard publishes.
- **One schema** (`src/lib/content/schema.ts`, zod) checks every save, types the content and lays out the editor, so
  a field added there appears in the form and the MCP with no other code. A new required field needs a default for
  content that is already stored.
- **Where mail goes stays in code.** Setup links and contact enquiries go to `CONTACT_TO_EMAIL` or the email in
  `src/content/site.ts`, never the editable copy, so an edit can't redirect sign-in links.
- **Previews keep their own content** (`content:preview:*` keys), as they share production's Upstash: editing on a
  preview never changes the live site.
- **Images** are paths under `public/` or full URLs; uploading from the dashboard isn't built yet.

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

- **Text is generated, read-only**, from the published projects on each view. To change the wording, edit the
  project under Content, or the export rules. Each field shows its length against the limit.
- **A PDF per project**, for forms that take one: the project's slides from the portfolio deck, with no site address
  or links (`/api/portfolio?project=<slug>`).
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
| Page and sign-in gate | `src/app/dashboard/page.tsx`; the app shell is `src/components/dashboard/App.tsx` |
| Setup and reset links (email, reveal, confirm) | `src/lib/dashboard/setup.ts`, `/api/dashboard/setup-link`, `/api/dashboard/setup`, page `src/app/dashboard/setup/page.tsx` |
| TOTP, session cookie, rate limit and replay | `src/lib/dashboard/totp.ts`, `src/lib/dashboard/auth.ts` |
| Sign in, renew and out | `POST` / `GET` / `DELETE /api/dashboard/session` |
| The dashboard's own records in Upstash (`.data/dashboard.json` in development) | `src/lib/dashboard/state.ts` |
| Activity feed and what pings | `src/lib/dashboard/activity.ts`, `/api/dashboard/activity` |
| Push: keys, devices, switches, sending | `src/lib/dashboard/push.ts`, `/api/dashboard/push`, `/api/dashboard/push/test`; worker `public/dashboard-sw.js` |
| Install: manifest and icons | `src/app/dashboard/manifest.webmanifest/route.ts`, `public/dashboard/` |
| Short links and their clicks | `src/lib/dashboard/links.ts`, `/api/dashboard/links`, `/api/dashboard/links/<name>` |
| The redirect | `src/app/go/[name]/route.ts`; previews are told apart in `src/lib/dashboard/visitor.ts` |
| Project export | `src/lib/dashboard/export.ts`; images zip at `/api/dashboard/projects/<slug>` |
| Content: schema, store, cached reads, defaults | `src/lib/content/` (`schema.ts`, `store.ts`, `read.ts`, `defaults.ts`, `changes.ts`) |
| Content editor | `src/components/dashboard/Content.tsx`, `src/components/dashboard/content/Editor.tsx`; actions in `src/app/dashboard/content-actions.ts`; Preview at `/api/dashboard/preview` |
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
