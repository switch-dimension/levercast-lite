---
feature: Post drafting MVP
slug: post-drafting-mvp
created: 2026-11-19
sources: [session, plan, verify, review, ship, git]
---

# Retro — Post drafting MVP

## Went well (keep doing)

- **GitHub Issues as the only task source.** Every task's status, commit and verify result lives in its issue (#2–#22), and checkpoint summaries are on #1. Nothing drifted between the plan and the issues.
- **Real-dependency tests.** Integration tests on a real `test` Neon branch and Playwright on a real dev server caught bugs that mocks would have hidden: the autosave status stuck after an `<Activity>` hide, a finished generation wiping other panels' edits, and the early-abort race.
- **Edge cases written as e2e tests first.** Both 5.1 bugs only showed up once the test drove the real flow (clearing cookies, leaving mid-stream).

## Could have gone better (what happened, evidence)

- **Next 16 `<Activity>` behaviour surprised us twice.** A hidden route keeps its state but runs effect cleanups. That caused the stuck "Saving…" (eb48249) and the stuck "Writing…" panel (c23b813). Each took a debugging loop to find.
- **The proxy redirected Server Action requests.** The session-expiry path was broken from Phase 1 until 5.1, because `proxy.ts` matched action POSTs (c23b813). It only surfaced when a test cleared cookies.
- **Production readiness was found late.** Deployment Protection covering the production `vercel.app` URL, the unmigrated `main` branch, and Neon's default password sign-up (#23) were all discovered in 5.4. Setting up the preview in 1.5 didn't include a production dry run.
- **No CI.** Every gate ran locally. The ship gates had to be re-run by hand, and there's no PR check (review suggestion).

## Suggested improvements

| # | Category | Change | Where | Effort | Apply? |
| --- | --- | --- | --- | --- | --- |
| 1 | Checks | Add a GitHub Action that runs Vitest (unit only, or with the `test` branch URL as a secret), lint, typecheck and build on PRs | `.github/workflows/ci.yml` | S | pending |
| 2 | Navigation | Add a line to `AGENTS.md`: hidden routes stay mounted in `<Activity>`, so effect cleanups run while state is kept; reset transient UI state (in-flight status, streams) in the cleanup or abort path | `AGENTS.md` | S | pending |
| 3 | Plan accuracy | In **mt-plan**, when the plan sets up a preview environment, add a matching production checklist to the first deploy task: protection scope, prod env vars, prod database migration, auth trusted domains and webhooks, and auth defaults to turn off | Molten `mt-plan` | S | pending |
| 4 | Standards | Review rule: background mutations (autosave, copy) never `redirect()`; they return a result the client can show | project coding standards / `AGENTS.md` | S | pending |

## Feedback for Molten skills

- **mt-ship / mt-build:** both say "never merge" and "ask in plain text". This project's founder explicitly asked the agent to merge. The skill could say "merge only when the user explicitly asks", so following the user doesn't read as breaking the skill.
- **mt-verify:** this verify ran after the build had already exercised every AC through e2e. A "verify from existing evidence" mode (map each AC to test names, then fill the gaps) would avoid re-walking flows that tests already drive.

---

# Retro — review fixes (2026-11-19, round 2)

Sources: session, review, verify, ship, git, tracker.

## Went well (keep doing)

- **Reproduce first.** Both blockers got a failing E2E test before the fix (058ff9d, 1220ccd), and verify added two more for the edges of the Home reset (40197ff).
- **Installed docs over memory.** The Home fix follows the `useLayoutEffect` cleanup pattern from `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`, and the #23 setting was chosen from Neon's Email OTP docs. Turning email+password off entirely would have broken emailed codes.
- **Dev first, then production.** #23 was changed on the dev branch, checked by the founder, then applied to `main`.

## Could have gone better

- **The same `<Activity>` trap came back.** Round 1's retro suggested an `AGENTS.md` line about hidden routes keeping state (suggestion 2, still `pending`), and #25 is that bug in a new place.
- **E2E only reaches pages with `page.goto`.** That's a full load, so it never sees state that `<Activity>` keeps. The review said the suite "can't see this" for #25.
- **Still no CI** (round 1, suggestion 1, still `pending`). Every gate in this ship ran locally only.
- **A follow-up ship reuses the feature's slug.** The ship report for `post-drafting-mvp` was overwritten twice (blocked, then this one), and the original survives only in git history. An unpushed commit on `main` (848770e) also rode along in the fix PR without any check catching it.
- **The fix shipped without a fresh review** (founder's call). It was a small diff, but the gate was skipped rather than met.

## Suggested improvements

| # | Category | Change | Where | Effort | Apply? |
| --- | --- | --- | --- | --- | --- |
| 1 | Navigation | Apply round 1's suggestion 2: one line in `AGENTS.md` saying hidden routes stay mounted in `<Activity>`, so reset hand-off and transient state in a `useLayoutEffect` cleanup | `AGENTS.md` | S | pending |
| 2 | Checks | In each E2E flow that leaves a page and comes back, return by clicking a link, not `page.goto`, so tests see the state `<Activity>` keeps | `e2e/`, plus a line in `AGENTS.md` | S | pending |
| 3 | Checks | Apply round 1's suggestion 1: a GitHub Action for lint, types, Vitest and build on PRs | `.github/workflows/ci.yml` | S | pending |
| 4 | Molten skills | mt-ship: for a follow-up to a merged feature, write the ship report under a new slug (e.g. `<slug>-fixes`) rather than overwriting it, and check `git log origin/<base>..<base>` for unpushed base commits during readiness | Molten `mt-ship` | S | pending |

## Feedback for Molten skills

- **mt-ship:** see suggestion 4. A follow-up ship needs its own report path, and readiness should catch unpushed commits on the base branch.
- **mt-review / mt-ship:** when a review runs after merge (here because mt-review changed), its blockers need a clear "fix forward" path. This round improvised one: a `fix/` branch, then verify, then ship.
