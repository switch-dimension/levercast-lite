---
feature: Post drafting MVP
slug: post-drafting-mvp
created: 2026-11-19
spec: molten-docs/spec/post-drafting-mvp.md
verdict: partial
molten_next_skill: mt-review
---

# Verification — Post drafting MVP

Every acceptance criterion except AC-13 has passing automated evidence. AC-13 (prompt quality) needs the founder's read, so the verdict is **partial** until that's recorded. Production sign-in is checked after deploy (see Not verified).

## Automated checks

Re-run on `fix/25-26-review-blockers` (the review fixes for #25 and #26, plus their regression tests), 2026-11-19. The original MVP run (6627126) is in git history.

| Check | Command | Result |
| --- | --- | --- |
| Unit + integration | `npx vitest run` | 17 files, 103 tests passed (real `test` Neon branch) |
| End-to-end | `npx playwright test` | 44 passed (real browser, `next dev`, `test` branch, mock model): the original 40 plus 4 for the fixes |
| Lint | `npm run lint` | clean |
| Types | `npx tsc --noEmit` | clean |
| Build | `npm run build` | succeeds (on 1220ccd; later commits only add tests) |

## Acceptance criteria

| AC | Verdict | Evidence |
| --- | --- | --- |
| AC-1 | pass | e2e `access`: an allowlisted user lands on Home; `happy-path`: signed out → sign-in → Home. Founder signed in with Google and an email code (checkpoint 1, #5) |
| AC-2 | pass | e2e `access`: invite-only notice, no code form, no user row; integration `allowlist`: webhook refuses uninvited emails, rejects bad signatures. A non-allowlisted Google account was turned away on the preview (checkpoint 1) |
| AC-3 | pass | integration `allowlist`: `Jo@Example.com` matches `jo@example.com` |
| AC-4 | pass | e2e `access` (pages redirect) and `generate-api` (401, not a redirect) |
| AC-5 | pass | e2e `access`: signing out returns to sign-in, and `/posts` then redirects (added in verify) |
| AC-6 | pass | integration `posts`: every query is scoped to its owner; another user's post is not found |
| AC-7 | pass | e2e `post-list` (order, preview, time, status); `copy`: the post shows Copied |
| AC-8 | pass | e2e `post-list`: Home with the writing box and recent posts; empty state |
| AC-8a | pass | e2e `posts` and integration `posts`: one post and one *post created* event from typing. e2e `posts` (#25): an idea left on Home survives client navigation and keeps saving to the same post |
| AC-9 | pass | e2e `posts`: Generate disabled for empty and over-5,000 ideas, with the length message |
| AC-10 | pass | e2e `delete` (cancel changes nothing, confirm removes, 404, events kept); `happy-path` |
| AC-11 | pass | e2e `editor`, `draft-editing`; integration `drafts` |
| AC-12 | pass | e2e `generation`, `editor`, `generate-api`, `happy-path` |
| AC-12a | pass | e2e `regenerate`: Regenerate all runs unedited drafts and asks in the edited one |
| AC-13 | not verified | `prompt-check` with the real model flagged 0 of 6 drafts (2 ideas). The founder's side-by-side read of 5 real ideas against ChatGPT is still to do |
| AC-14 | pass | e2e `generation`; integration `generate` (X saved one tweet per element) |
| AC-15 | pass | e2e `generation`, `draft-editing` (highlighted, still saves) |
| AC-16 | pass | e2e `generation` (failed panel shows Try again, others finish); integration `generate` (three failure modes). e2e `regenerate` (#26): Try again on an unedited draft regenerates at once |
| AC-17 | pass | e2e `regenerate`: only that platform changes |
| AC-18 | pass | e2e `regenerate`, `happy-path`, `accessibility` (keyboard). e2e `regenerate` (#26): Try again on an edited draft asks first; Keep my edit makes no model call, Replace it regenerates |
| AC-19 | pass | e2e `generation`: controls disabled while writing |
| AC-20 | pass | e2e `generation`; integration `generate` (429, no model call) |
| AC-21 | pass | e2e `draft-editing`: edits survive a reload |
| AC-22 | pass | e2e `copy`, `happy-path`; integration `copy` |
| AC-22a | pass | e2e `copy` (Copy tweet 3); integration `copy` (tweet number and texts) |
| AC-23 | pass | e2e `stale` (both cases); integration `generate` |
| AC-24 | pass | e2e `event-log`: created, 4 started, 4 completed, 2 copied |
| AC-25 | pass | e2e `copy`; integration `copy` |
| AC-26 | pass | unit `microcopy`: no page or component reads the event log |

## Edge cases & error states tried

- Session expires mid-edit: text stays, "Please sign in again" on drafts and the idea, nothing saved (`edge-cases`).
- Leaving mid-stream: partial drafts discarded, *generation failed* recorded for every started run, return shows *Not generated* (`edge-cases`); aborts before and during streaming (integration `generate`).
- Model throws, error part mid-stream, empty output (integration `generate`).
- Daily cap reached (AC-20). Over-limit drafts (AC-15). Blocked clipboard (`copy`).
- Removing an email revokes access at once (`access`). Another user's post (AC-6).
- Keyboard-only editing, regenerating and copying with visible focus; reduced motion; 375px viewport (`accessibility`).
- After Generate, returning to Home by the logo link and by browser Back: both show an empty box with no stuck "Opening…", and the next idea is a new post (`generation`, #25).
- An idea left on Home without Generate is kept across a client-side trip to My posts and back, so the reset only follows a hand-off (`posts`, #25).
- A failed run, then an edit to the draft still showing, then Try again: asks first (`regenerate`, #26).

## Failures found and fixed (cause → fix → regression test)

- Expired session showed "Couldn't save": the proxy redirected Server Action requests before they ran → actions skip the proxy and return a signed-out result → `edge-cases` session test (c23b813).
- Leaving within a moment of Generate let drafts finish and save: the abort fired before the listener existed → honour an already-aborted signal → integration abort tests and `edge-cases` (c23b813).
- Returning after leaving mid-stream showed a stuck "Writing…" panel → aborted runs reset → `edge-cases` (c23b813).
- Keep my edit dropped keyboard focus; the status strip hid states from screen readers on phones → `accessibility` (b7d6eba).
- **Found by mt-review, fixed after merge:**
  - **#25:** returning to Home after Generate brought back the old idea and post ID, so the next idea overwrote the previous post. Cause: `<Activity>` keeps Home alive. Fix: reset the box when Home is hidden after a hand-off, and make it read-only during the hand-off. Regression tests: `generation` (logo link, browser Back) and `posts` (mid-draft idea kept). Commit 058ff9d.
  - **#26:** Try again overwrote an edited draft without asking. Cause: it called `generate()` and skipped the edited-draft check. Fix: route it through `regenerate()`. Regression test: `regenerate`. Commit 1220ccd.
- Earlier phases: autosave stuck on "Saving…" after a hidden unmount (eb48249); generation finishing wiped edits in other panels (63f3634).

## Not verified (and why)

- **AC-13 prompt quality:** needs the founder's judgement on real ideas.
- **Production check of #25:** after the fixes deploy, the founder clicks Generate, then the Levercast logo, then types a new idea, and checks that it's a new post. (Production sign-in with an emailed code and with Google was confirmed by the founder on 2026-11-19, after password sign-up was turned off for #23.)
- **Real phone:** the 375px pass ran in Playwright, not on a device.
- **Real model in the deployed app:** e2e uses the mock model; the real model was exercised through `prompt-check` locally. Production uses AI Gateway over OIDC, confirmed by the founder's first generation.

## Verdict

**Partial:** the review blockers #25 and #26 are fixed and guarded by tests, and every AC except AC-13 passes with evidence. AC-13 (prompt quality) and the production check of #25 wait on the founder.
