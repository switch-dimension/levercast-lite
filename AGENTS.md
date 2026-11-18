<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Task tracking

Tasks have exactly **one source of truth**, the *task source*. It's either an issue tracker (GitHub Issues, Linear, Jira) or the plan file, never both. `molten-docs/config.md` decides which: a tracker with `tracker_sync: true` makes the tracker the source; otherwise the plan is.

**For this project, the task source is GitHub Issues** on `switch-dimension/levercast-lite`. Use the `gh` CLI (`gh issue list`, `gh issue create`, `gh issue view <n>`).

- Keep each task's details (files, acceptance criteria, verify step, blockers) and its status (open, in progress, done) **only in its issue**.
- Don't duplicate tasks or their status in `molten-docs/` files or anywhere else. A plan in `molten-docs/plan/` keeps the approach, architecture, setup, phase order, waves, and checkpoints. It lists tasks only as links to their issues, with no checkboxes and no status.
- If an issue and a doc disagree about a task, the issue wins; fix the doc.
- File bugs, follow-ups, and anything noticed during a build as new issues (label `molten`, a sub-issue of the feature's parent issue), not as notes in a doc.
- If the task source ever changes (for example, to plan-only), move every open task across in one step and retire the old copy, so there are never two live lists.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org): `type(scope): summary` (imperative, lowercase, ≤72 chars), blank line, then a short body explaining what and why. Types: feat, fix, docs, refactor, perf, test, build, ci, chore, style. Scope is an area noun (e.g. `auth`, `posts`, `db`, `ai`, `ui`, `docs`).
