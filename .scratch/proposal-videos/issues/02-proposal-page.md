# The /proposal page plays the videos

Status: ready-for-agent
Spec: ../spec.md

## What to build

`/[lang]/proposal`: `noindex`, not in the navbar, the normal site chrome. Titled videos in order ("1. The problem"), Novel's note, then one button: the rate card when the link has `rates`, otherwise the contact page tagged with the link code. Without a proposal, a short note like `/rates`. A tailored link with a proposal opened on the home page moves straight to `/proposal`, keeping `?v=` (and the open counted once). Wording in English and Bahasa.

## Acceptance criteria

- [x] Opening `/?v=<code>` for a link with a proposal lands on `/proposal`
- [x] Videos show in order with their titles; Novel's note shows as typed
- [x] The button goes to `/rates` with `rates`, else to `/contact?proposal=<code>`
- [x] Without a proposal the page shows the private note
- [x] Bahasa wording on `lang: "id"` links

## Blocked by

- 01

## Comments

2026-11-19: Implemented on branch `claude/proposal-videos`, test-first (unit tests in `src/lib/proposal/*.test.ts`, end to end in `e2e/proposal.spec.ts`). All acceptance criteria covered by passing tests.
