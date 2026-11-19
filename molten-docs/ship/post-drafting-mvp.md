---
feature: Post drafting MVP
slug: post-drafting-mvp
created: 2026-11-19
spec: molten-docs/spec/post-drafting-mvp.md
result: blocked
pr: null
---

# Ship — Post drafting MVP

The MVP itself already shipped: [PR #24](https://github.com/switch-dimension/levercast-lite/pull/24) merged as `399eeba` and is live at https://levercast-lite.vercel.app. That ship report (gates, smoke checks, rollout and rollback) is in git history at `848770e:molten-docs/ship/post-drafting-mvp.md`.

This run covers the follow-up after the two-reviewer re-review, and it's blocked.

## Readiness

| Check | Status |
| --- | --- |
| Review | **red**: `request-changes`, two blockers (`molten-docs/review/post-drafting-mvp.md`, reviewed at `194d0d3`) |
| Verify | partial: 28 of 29 ACs pass; AC-13 waits on the founder's prompt-quality read |
| Tasks | **open**: #25 and #26 (review blockers), #23 (password sign-up on production) |
| Branch | on `main`; no fix branch exists yet, and no app code has changed since `194d0d3` |

## Tidy

Not run, because readiness failed.

## Gates

| Gate | Command | Result |
| --- | --- | --- |
| Build | — | skipped: readiness failed |
| Tests | — | skipped: readiness failed |
| Lint | — | skipped: readiness failed |
| Type-check | — | skipped: readiness failed |
| Secrets | — | skipped: readiness failed |
| Dependencies | — | skipped: readiness failed |

## Docs and release

Not run.

## Pull request

None opened.

## Blocked on

1. [#25](https://github.com/switch-dimension/levercast-lite/issues/25): Home's idea box keeps its old post ID and stays on "Opening…" after client-side navigation, so the next idea overwrites the previous post.
2. [#26](https://github.com/switch-dimension/levercast-lite/issues/26): Try again replaces an edited draft without asking (breaks FR-15).

**Route:** **mt-build** on a `fix/` branch for #25 and #26, each with the E2E test the review asks for. The review suggests doing the panel-Regenerate idea flush and the OTP-send route block in the same pass. Then **mt-verify**, then **mt-review** of the fix diff, then **mt-ship**. Fix both before inviting more testers, along with #23.
