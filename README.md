# Novel Bafagih — Portfolio

Next.js 16 (App Router) · Tailwind CSS 4 · GSAP 3 (ScrollTrigger, SplitText, DrawSVG) · Lenis.
Built from the Figma file **Hi-Fi** (`EGuNrOMhvZ2N2HhjafkEmp`); motion follows [MOTION_SPEC.md](MOTION_SPEC.md).

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

## Where things live

| What | Where |
|---|---|
| Copy, links, projects, testimonials, experiences | `src/content/site.ts` |
| Landing sections | `src/components/sections/*` |
| Experiences / Contact pages | `src/app/experiences/page.tsx`, `src/components/contact/*` |
| Motion per section (presets) | `src/components/motion/SectionMotion.tsx` |
| Reusable effects (reveal, line draw, starburst, parallax, magnetic) | `src/lib/motion.ts` |
| Page transition + first-load loader | `src/components/transition/PageTransition.tsx` |
| Design tokens (Midnight palette, type scale) | `src/app/globals.css` |
| Figma assets | `public/figma/**` |

## Sizing

Layouts are authored in Figma pixels. `--s` (in `globals.css`) is one design pixel, and Tailwind's spacing scale is
bound to it, so `w-1240`, `top-195`, `gap-39` are the Figma numbers. Desktop uses the 1440 frame (scaled to the
viewport, capped at 1440px); below 1024px (phones and portrait tablets) it switches to a 430px phone frame, scaled up
to the screen, with `max-md:` layouts.

## Contact form

`POST /api/contact` sends enquiries through [Resend](https://resend.com). Copy `.env.example` to `.env.local` and set
`RESEND_API_KEY` (plus optionally `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL`). Without a key, submissions are only logged
in development, and in production the form shows an "email me directly" fallback.

## Tailored CVs and links

The master CV is `src/content/cv.ts`: every role, project and bullet, longer than any one CV, each bullet with an id,
tags and a weight. A **variant** picks, orders and titles lines from it for one application (`src/lib/cv/schema.ts`), and
is stored under a random code. A link like `/?v=k7qx2pmd` applies it: the code leaves the address bar at once, the
variant is kept in the visitor's localStorage, the projects page leads with its projects, the mode can switch, and
`/cv` plus its PDF (`/api/cv`) show the tailored two-page CV. The portfolio deck (`/api/portfolio`, a 16:9 PDF
built in `src/lib/portfolio/`) shows the variant's first three projects. The private label (who it was for) never leaves
the server.

- Storage: Upstash Redis (`KV_REST_API_URL`, `KV_REST_API_TOKEN`, as Vercel's Upstash integration sets them). Without
  them, development keeps variants in `.data/cv-variants.json`.
- Agents tailor through MCP at `/api/mcp` (Streamable HTTP). Set `CV_MCP_TOKEN` and send it as a bearer token; locally,
  with no token set, the endpoint is open. Tools: `get_cv_master`, `preview_cv` (text plus PDF page count),
  `save_cv_variant`, `list_cv_variants`, `get_cv_variant`, `delete_cv_variant`. In Claude Code:

  ```bash
  claude mcp add --transport http novel-cv https://<your-domain>/api/mcp --header "Authorization: Bearer <CV_MCP_TOKEN>"
  ```

## Still placeholder (TODO in `src/content/site.ts`)

- Project titles and links (cards without `href` aren't clickable).
- The testimonial and the three experience columns are the Figma placeholders.
