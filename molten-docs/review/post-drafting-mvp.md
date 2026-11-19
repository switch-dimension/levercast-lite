---
feature: Post drafting MVP
slug: post-drafting-mvp
created: 2026-11-19
spec: molten-docs/spec/post-drafting-mvp.md
recommendation: approve-with-suggestions
molten_next_skill: mt-ship
---

# Review — Post drafting MVP

## Summary

The branch is the whole MVP: invite-only sign-in (Neon Auth plus an allowlist), posts with autosave, three streaming drafts per idea, editing, copying, regenerating with a confirmation, stale-draft notes, the event log, and the release docs. 28 commits, about 9,700 added lines across 108 files.

That is far past a reviewable single diff. But it was built and checkpointed one task at a time (issues #2–#22), each with its own tests and a green suite, so this review reads the risky surfaces closely and the rest by sampling. Overall it's well structured: thin Server Actions and routes over `lib/` functions that take a `userId`, real-database tests, and no new dependencies beyond the plan.

## Findings

### Blockers

None.

### Suggestions

- **Security: password sign-up is on in production Neon Auth.** This is a Neon setting, not code. Email+password sign-up is enabled on `main` by default, though the app never uses passwords. Someone who knows an invited tester's email could pre-register it and try to take the account once the tester links Google. Filed as [#23](https://github.com/switch-dimension/levercast-lite/issues/23). Fix before inviting testers beyond the founder.
- `lib/ai/generate.ts`: the daily cap is checked with a count, then the *generation started* event is inserted. Parallel requests near the limit can overshoot 50 by up to 2 (one Generate click is 3 requests). That's acceptable for a soft cost cap; make it a single conditional insert if the cap ever needs to be exact.
- `e2e/post-list.spec.ts`: the 100-post timing check (under 1 s) ran 1,109 ms once on `next dev`. It's a timing assertion against a dev server; consider measuring against a production build or widening the margin if it flakes again.
- No CI workflow. The gates run locally only. A GitHub Action running Vitest, lint, typecheck and build on PRs would catch regressions without a local run (Playwright needs the `test` branch secrets).

### Nits

- Nit: the light-pink error tint `#fbeeed` is repeated as an arbitrary Tailwind value three times across two components; a design token would keep it in one place.

### Questions

- None blocking.

### Praise

- Auth is checked at every entry point: every page, Server Action and route handler calls `requireUser()` or `getCurrentUser()`. The proxy is only an optimistic redirect, which is what let Server Actions safely skip it for the session-expiry fix.
- The webhook signature check is careful: Ed25519 only, `kid` lookup with one refresh, a 5-minute freshness window, and it never throws (fails closed).
- The generation stream reports its result in-band and always closes cleanly, so browsers never retry a POST. Every failure path (model error, error part, empty output, abort, timeout) records *generation failed* and leaves the previous draft alone. This is backed by integration tests for each path.
- Tests assert behaviour through real interfaces: a real Neon branch, a real browser and the real stream. Several bugs (autosave stuck after a hidden unmount, edits wiped by a finished generation, the early-abort race) were caught by tests and fixed at the cause.

## Axis notes

- **Correctness:** 28 of 29 ACs have passing automated evidence (see `molten-docs/verify/post-drafting-mvp.md`). AC-13 waits on the founder's prompt-quality read.
- **Readability:** clear names; comments explain constraints (why a guard exists), not the next line. Domain logic lives in pure modules under `lib/domain` with unit tests.
- **Architecture:** follows the plan: App Router, Server Actions as thin wrappers, Drizzle over neon-http using `db.batch` where a transaction would be. One migration, no schema drift.
- **Security:** allowlist enforced on the server in three places; ownership checked in every query (`owned()` subqueries); input validated in actions (`isUuid`, `isValidDraftEdit` with size limits); no secrets in git (gitleaks clean). See the #23 suggestion.
- **Performance:** My posts is a single query with a 100-post budget test; generations stream in parallel; no N+1 queries found in the data layer.

## Recommendation

**Approve with suggestions.** Nothing blocks the merge. #23 should be done before more testers are invited, and the other suggestions can wait.
