---
feature: Post drafting MVP
slug: post-drafting-mvp
created: 2026-11-19
spec: molten-docs/spec/post-drafting-mvp.md
result: pr-open
pr: https://github.com/switch-dimension/levercast-lite/pull/24
---

# Ship — Post drafting MVP

## Readiness

- Review: approve with suggestions, no blockers (`molten-docs/review/post-drafting-mvp.md`).
- Verify: partial. 28 of 29 ACs pass; AC-13 waits on the founder's prompt-quality read. No code changed after verify apart from this doc.
- Tasks: #2–#21 closed. #22 (release) closes on merge, once production is checked.
- Branch: `feat/1-post-drafting-mvp`, 0 commits behind `main`, merges cleanly.
- Database branches: `post-drafting-mvp` (dev, used by previews and local) and `test` stay open; they're the ongoing dev and test environments.

## Tidy

- Working tree clean apart from a pre-existing, unrelated whitespace edit in `.agents/skills/mt-build/SKILL.md` (not committed).
- No debug logs, `.only`, or skipped tests in the diff. Temporary debug logging during 5.1 was removed before committing.
- No `.env` files committed; `.env.example` added and allowed by `.gitignore`.

## Gates

| Gate | Command | Result |
| --- | --- | --- |
| Build | `npm run build` | pass |
| Tests | `npx vitest run` · `npx playwright test` | 103 passed · 40 passed |
| Lint | `npm run lint` | pass |
| Type-check | `npx tsc --noEmit` | pass |
| Secrets | `gitleaks git --log-opts="origin/main..HEAD"` | pass (27 commits, no leaks) |
| Dependencies | — | skipped: no dependencies beyond those the plan approved in Phase 1 |

## Docs and release

- README rewritten: run, test, deploy, add a tester. `.env.example` lists every variable.
- No CHANGELOG or versioning in this project.
- Migration `drizzle/0000_init.sql` is already applied to Neon `main`.

## Pull request

[#24](https://github.com/switch-dimension/levercast-lite/pull/24). Checks: Vercel preview passed. The repo has no CI workflow (retro suggestion 1). The founder asked for the merge, so it's merged after this report.

## Rollout and rollback

- **Already in place:** Vercel protection limited to previews; production env vars for Neon `main`; `main` migrated; founder on the production allowlist; Neon Auth trusted domain and `user.before_create` webhook pointed at production.
- **Watch:** the founder signs in on production; a non-allowlisted account is refused; the first real generation works (AI Gateway over OIDC); `vercel logs --environment production` for webhook or generation errors.
- **Roll back:** promote the previous production deployment in Vercel, or revert the merge. The four tables are additive and can stay.
- **Before more testers:** #23 (turn off password sign-up on production Neon Auth).
