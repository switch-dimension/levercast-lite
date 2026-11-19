---
feature: Post drafting MVP
slug: post-drafting-mvp
created: 2026-11-19
spec: molten-docs/spec/post-drafting-mvp.md
result: pr-open
pr: PR_URL
---

# Ship — Post drafting MVP (review fixes)

The MVP itself shipped in [PR #24](https://github.com/switch-dimension/levercast-lite/pull/24), merged as `399eeba` and live at https://levercast-lite.vercel.app. That ship report (gates, smoke checks, first rollout) is in git history at `848770e:molten-docs/ship/post-drafting-mvp.md`.

This run ships the fixes for the two blockers from the two-reviewer re-review.

## Readiness

| Check | Status |
| --- | --- |
| Review | **Not re-reviewed (founder's call).** The review on file (`molten-docs/review/post-drafting-mvp.md`, at `194d0d3`) requests changes for #25 and #26. Both are fixed, but the fix commits weren't reviewed: the founder chose to ship without a fresh mt-review. |
| Verify | partial: every AC except AC-13 passes, including new evidence for AC-8a, AC-16 and AC-18 (`molten-docs/verify/post-drafting-mvp.md`). AC-13 and a production check of #25 wait on the founder. |
| Tasks | #25 and #26 closed with commits. #23 closed (Neon Auth change, below). #27 and #28 are follow-up suggestions, open under #1 and not part of this PR. |
| Branch | `fix/25-26-review-blockers`, 0 behind `origin/main`, no worktrees left over. It also carries `848770e` (the Molten skills update), which was committed on `main` but never pushed. |
| Database branches | No schema change. `post-drafting-mvp` (dev) and `test` stay open as the ongoing environments. |

## Tidy

- Working tree clean. No debug logs, `.only`, skips, or new TODOs in the diff.
- History: two fixes, one test commit, two docs commits, and the carried skills commit. Nothing to squash.

## Gates

Run on the final branch state, 2026-11-19.

| Gate | Command | Result |
| --- | --- | --- |
| Build | `npm run build` | pass |
| Tests | `npx vitest run` · `npx playwright test` | 103 passed · 44 passed |
| Lint | `npm run lint` | pass |
| Type-check | `npx tsc --noEmit` | pass |
| Secrets | `gitleaks git --log-opts="origin/main..HEAD"` | pass (6 commits, no leaks) |
| Dependencies | — | skipped: no `package.json` or lockfile changes |

## Docs and release

- No README, env or migration changes. No CHANGELOG or versioning in this project.

## Neon Auth change (#23, outside the PR)

Email+password **sign-up** is off on `main` and `post-drafting-mvp` (`disable_sign_up: true`). Email sign-in itself stays on, because Neon's emailed codes depend on it. `test` is unchanged for Playwright. On production, a direct `POST /sign-up/email` is refused (`400 EMAIL_PASSWORD_SIGN_UP_DISABLED`), and the founder confirmed emailed-code and Google sign-in.

## Pull request

PR_LINK. Checks: CI_RESULT. The repo has no CI workflow, so the Vercel preview is the only check.

## Rollout and rollback

- **On merge:** Vercel deploys `main` to production. There are no migrations or env changes.
- **Watch:** on production, click Generate on Home, then the Levercast logo, then type a new idea. It should start as a new post with an empty box and an enabled Generate. Then fail a regeneration, edit the draft, and click Try again: it should ask first.
- **Roll back:** promote the previous production deployment in Vercel, or revert the merge. The Neon Auth change is separate; turn `disable_sign_up` back off only if emailed-code sign-in breaks.
