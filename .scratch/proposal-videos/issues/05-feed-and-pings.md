# Proposal pings and feed lines

Status: ready-for-agent
Spec: ../spec.md

## What to build

`POST /api/proposal` forwards two events to the feed and the phone, keeping nothing else: the first play of a viewing ("Acme started your proposal") and one summary per viewing when it ends ("Acme: watched 2 of 3 videos, 6:10 of 9:30, left during video 3 at 1:12"). New `ActivityKind`s with a push preference and title, carrying the visit's PostHog session/person. Quiet period, `nb_test` and link-preview exclusions apply.

## Acceptance criteria

- [x] Summary sentence unit-tested
- [x] Start and summary land in `dash:events` (e2e)
- [x] `nb_test` sends nothing
- [x] A "Proposals watched" push preference

## Blocked by

- 04

## Comments

2026-11-19: Implemented on branch `claude/proposal-videos`, test-first (unit tests in `src/lib/proposal/*.test.ts`, end to end in `e2e/proposal.spec.ts`). All acceptance criteria covered by passing tests.
