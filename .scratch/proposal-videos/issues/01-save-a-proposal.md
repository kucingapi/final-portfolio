# Save a proposal on a tailored link

Status: ready-for-agent
Spec: ../spec.md

## What to build

`save_cv_variant` takes an optional `proposal`: `videos` (one or more `{ url, title }`, in order) and an optional `note`. Any YouTube URL form (`watch?v=`, `youtu.be/`, `shorts/`, `embed/`) is accepted and stored as the video id; anything that isn't YouTube is refused with a clear error. The returned links include the `/proposal` page, and the site link opens on it.

## Acceptance criteria

- [x] `youTubeId()` parses every YouTube URL form and rejects other hosts (unit tests)
- [x] A variant with a proposal stores `{ id, title }` per video, never the URL or the video
- [x] A non-YouTube URL is refused by `checkVariant` with the video's position
- [x] `links()` returns `proposal`, and `site` points at it when the link has a proposal

## Blocked by

None

## Comments

2026-11-19: Implemented on branch `claude/proposal-videos`, test-first (unit tests in `src/lib/proposal/*.test.ts`, end to end in `e2e/proposal.spec.ts`). All acceptance criteria covered by passing tests.
