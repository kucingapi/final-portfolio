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
viewport, capped at 1440px); below 768px it switches to a 430px phone frame with `max-md:` layouts.

## Contact form

`POST /api/contact` sends enquiries through [Resend](https://resend.com). Copy `.env.example` to `.env.local` and set
`RESEND_API_KEY` (plus optionally `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL`). Without a key, submissions are only logged
in development, and in production the form shows an "email me directly" fallback.

## Still placeholder (TODO in `src/content/site.ts`)

- `public/resume.pdf`: the Resume button points here.
- Social profile URLs (GitHub, LinkedIn, Instagram, Upwork). Icons without a URL render dimmed and aren't links.
- Project titles and links (cards without `href` aren't clickable).
- The testimonial and the three experience columns are the Figma placeholders.
