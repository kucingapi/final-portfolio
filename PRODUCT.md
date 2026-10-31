# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences with equal weight:

- **Prospective clients**: founders and small teams looking for someone to build a web or mobile product. They want to know quickly whether Novel can ship what they need, and then get in touch through the contact flow (service picker: Design, Web, Mobile, Others).
- **Employers and recruiters**: people evaluating Novel for an engineering role. They want the track record (experience history, projects, CV) and a way to reach out.

Both arrive mostly cold, from a link (social profile, Upwork, application, referral), and decide within a short visit whether to reach out.

## Product Purpose

The personal site of Novel Bafagih, a software engineer based in Jakarta, Indonesia. It exists to turn a visit into a conversation: a project enquiry from a client, or an interview from an employer. Success is a sent contact form, email, call, or CV download from someone who fits.

## Positioning

Novel is a **software engineer who uses AI in the workflow, cleanly**: AI tools speed the work up, but what ships is reviewed, maintainable, well-engineered code. The engineering is the product; AI is how Novel gets there quickly without cutting corners. The work spans web (React, Next.js) and Android (Kotlin, Jetpack Compose), plus whatever else a problem needs.

The positioning is not "junior" and not "low cost". Neither framing appears in the pitch.

## Operating Context

- Visitors land on the home page (hero, about, projects, core values, testimonials, contact prompt), with separate Experiences and Contact pages.
- The contact flow sends enquiries by email through Resend (`POST /api/contact`); without a key it falls back to "email me directly".
- Direct channels: email `novelbafagih09@gmail.com`, phone `+62 8953 2807 9912`, Asia/Jakarta time zone.
- Employers will also want the resume PDF (`/resume.pdf`) and social profiles (GitHub, LinkedIn, Upwork, Instagram).

## Capabilities and Constraints

- Stack: Next.js 16 (App Router), React 19, Tailwind CSS 4, GSAP 3 + Lenis. All copy and lists live in `src/content/site.ts`.
- Built from the Figma file **Hi-Fi** (`EGuNrOMhvZ2N2HhjafkEmp`); motion follows `MOTION_SPEC.md`.
- Site copy was rewritten to the positioning (2026-10-31): hero asks "Looking for a Software Engineer?", the "Low Cost" core value became "AI-Assisted, Human-Reviewed" (key `aiAssisted`), and the Experiences subtitle reads "Software Engineer / Freelance & Full-time".

## Brand Commitments

- Name: **Novel Bafagih**. Logo at `public/figma/brand/logo.svg`.
- The existing Figma Hi-Fi design and `MOTION_SPEC.md` are the current design authority for the incumbent site.

## Evidence on Hand

Real, but not yet in the repo (current entries are Figma placeholders and must not be presented as real):

- **Testimonials**: genuine client and teammate quotes are coming. The four in `site.ts` are placeholders, including the Figma sample.
- **Projects**: Proyek mobile app, Girls in IT community website, PetHub mobile app, and a patient information platform are real and will get links or case studies. Images in `public/figma/projects/`.
- **Experience history**: real Education, Leadership and Professional entries will replace the duplicated placeholder columns. Confirmed so far: Bachelor in Information Technology, Universitas Brawijaya (2020–2024); Android Developer, Bangkit Academy (Feb–Jul 2023).
- **Social profiles and CV**: GitHub, LinkedIn, Upwork, Instagram URLs and `public/resume.pdf` will be added.

Do not invent clients, metrics, quotes, employers or project outcomes to fill these gaps.

## Product Principles

1. **Engineering first, AI as leverage.** Claims about AI describe how Novel works (faster, still clean and reviewed), never a gimmick or a replacement for judgment.
2. **Serve both readers.** Every key page should let a client start a project and let an employer find the track record, without either feeling like the afterthought.
3. **Proof over adjectives.** Real projects, real testimonials and real history carry the case; placeholder proof never ships as if it were real.
4. **One step to contact.** From anywhere on the site, reaching Novel is short and obvious.
