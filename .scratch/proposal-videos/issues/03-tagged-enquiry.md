# Enquiries from a proposal are tagged

Status: ready-for-agent
Spec: ../spec.md

## What to build

The contact form opened from a proposal sends the link code; the server checks it belongs to a link with a proposal and saves it on the enquiry (and in the email copy), so Novel knows where it came from.

## Acceptance criteria

- [x] An enquiry sent from `/contact?proposal=<code>` carries `proposal: <code>` in the Inbox and the email
- [x] An unknown or malformed code is ignored, never refused

## Blocked by

- 02

## Comments

2026-11-19: Implemented on branch `claude/proposal-videos`, test-first (unit tests in `src/lib/proposal/*.test.ts`, end to end in `e2e/proposal.spec.ts`). All acceptance criteria covered by passing tests.
