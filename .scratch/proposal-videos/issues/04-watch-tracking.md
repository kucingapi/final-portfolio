# Watch tracking to PostHog

Status: ready-for-agent
Spec: ../spec.md

## What to build

The YouTube IFrame Player API drives a pure **viewing** tracker: per video, played, seconds watched, furthest point, dropped at, skipped and rewatched ranges, reached the end. Play, pause, seek, end and progress (every ~15 s while playing, and on page hide) go to PostHog through `loadAnalytics`, each carrying `v_code`, the viewing id and the video's stats so far. Nothing is stored on the server; Novel's browser sends nothing.

## Acceptance criteria

- [x] Tracker unit tests: watched, furthest, skipped, rewatched, dropped at, ended, seeks detected from jumps
- [x] Events reach PostHog with `v_code` (e2e, relay intercepted)
- [x] No watch data written to `.data/` or Redis

## Blocked by

- 02

## Comments

2026-11-19: Implemented on branch `claude/proposal-videos`, test-first (unit tests in `src/lib/proposal/*.test.ts`, end to end in `e2e/proposal.spec.ts`). All acceptance criteria covered by passing tests.
