# Watch data on the link's dashboard sheet

Status: ready-for-human
Spec: ../spec.md

## What to build

The tailored link's sheet shows each viewing per video (watched / furthest / dropped at / skipped / rewatched / finished) with a button to its PostHog replay, read from PostHog's HogQL query API when the sheet opens, filtered by `v_code`. Needs `POSTHOG_PERSONAL_API_KEY` (in `.env.example`); without it the panel says so clearly. The MCP's `get_cv_variant` returns the same summary.

## Acceptance criteria

- [x] Rows → viewings grouping unit-tested
- [x] Missing key → clear message (e2e)
- [x] Replay link per viewing

## Blocked by

- 04

## Comments

2026-11-19: Implemented on branch `claude/proposal-videos`, test-first (unit tests in `src/lib/proposal/*.test.ts`, end to end in `e2e/proposal.spec.ts`). All acceptance criteria covered by passing tests.

Left for Novel (ready-for-human): create a PostHog personal API key with "query: read" and set `POSTHOG_PERSONAL_API_KEY` on Vercel (`NEXT_PUBLIC_POSTHOG_PROJECT_ID` must be set too). Until then the sheet says which is missing.
