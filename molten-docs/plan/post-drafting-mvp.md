---
feature: Post drafting MVP
slug: post-drafting-mvp
created: 2026-11-18
spec: molten-docs/spec/post-drafting-mvp.md
status: approved
issue_tracker: github
tracker_parent: https://github.com/switch-dimension/levercast-lite/issues/1
molten_next_skill: mt-build
---

# Plan — Post drafting MVP

> **Where tasks live.** [GitHub Issues](https://github.com/switch-dimension/levercast-lite/issues/1) is the single source of truth for this feature's tasks. Each task's issue holds its files, covered ACs, done-condition, verify step, blockers, and status. This plan holds the approach, architecture, setup, phase order, waves, and checkpoints. It lists tasks only as links, and it never tracks their status.

## Approach

Build a walking skeleton first: schema, test harness, design tokens, and sign-in behind the allowlist. Then add one thin path at a time: write an idea → see it in the list → open it → generate → edit → copy → regenerate. Every phase ends with a deployable app.

The two riskiest parts go early:
- **Auth plus allowlist.** Neon Auth isn't enabled yet, and the allowlist relies on a webhook (Phase 1).
- **Prompt quality.** The prompts are written in Phase 1, so the founder can start iterating on them days before the UI exists. This check gates inviting testers.

The deadline is ~2026-11-25, so the plan uses no extra libraries beyond the expected set and builds the UI by hand with Tailwind and Ink & Paper tokens.

## Architecture decisions

1. **Routes** (App Router, route group `app/(app)/` for signed-in pages):
   - `/`: Home (writing box plus recent posts)
   - `/posts`: My posts
   - `/posts/[postId]`: the post editor
   - `/sign-in`: Google plus email, and the invite-only notice
   - `/api/auth/[...path]`: the Neon Auth handler
   - `/api/webhooks/neon-auth`: the allowlist webhook
   - `/api/posts/[postId]/generate/[platform]`: the streaming generation endpoint

   After sign-in, users land on **Home** (FR-6 and AC-8). AC-1 was updated to match on 2026-11-18.
2. **Auth.** We use `@neon/auth` (Managed Better Auth):
   - `lib/auth/server.ts` calls `createNeonAuth`, and `lib/auth/client.ts` calls `createAuthClient`.
   - `proxy.ts` (`auth.middleware`) only does the optimistic redirect for signed-out page requests.
   - The real check is `lib/dal.ts → requireUser()`, which checks the session *and* the allowlist. Every page, Server Action and Route Handler calls it. Pages redirect to `/sign-in`; APIs return 401.
   - With `cacheComponents: true`, session reads sit inside `<Suspense>`. Per-user data isn't cached with `use cache` in the MVP. See `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`.
3. **The allowlist is enforced in three places, all on the server:**
   - a Neon Auth `user.before_create` webhook. It fails closed, so no user row is created (AC-2), and it covers Google sign-up.
   - the email sign-in action checks the allowlist *before* asking Neon Auth to send a code, so uninvited people see the notice at once and get no email
   - `requireUser()` re-checks on every request, so removing an email revokes access

   Emails are normalised to trimmed lowercase in `lib/auth/allowlist.ts` (AC-3).

   The webhook runs on Vercel previews and production only, because Neon can't reach `localhost`. In local development, the email-form check and `requireUser()` enforce the allowlist.
11. **Email sign-in (OQ-1).** Email sign-in uses a one-time code, sent by Neon Auth's built-in email sender. There's no custom provider in the MVP.
12. **Playwright sign-in (OQ-1).** A seeded test user signs in with a password through the auth API on the `test` Neon branch, and `e2e/global-setup.ts` saves `storageState`. The app never shows a password field.
    - *Changed in 1.4 (2026-11-18):* Neon's email one-time-code sign-in requires the branch's "Sign-up and Sign-in with Email" setting, which is the email-and-password switch, so it stays **on** for every branch. On `main` (and the branches cloned from it) the password path is closed with `require_email_verification: true` and `send_verification_email_on_sign_up: false`. A password sign-up through the API can never sign in, while code and Google sign-ins verify the email and work. Task 1.6 makes the seeded E2E user's email verified on `test`.
4. **Mutations vs streaming:**
   - Posts, draft edits, and copy events use Server Actions (`app/(app)/actions.ts`, `app/(app)/posts/[postId]/actions.ts`). These are thin wrappers over `lib/posts.ts`, `lib/drafts.ts` and `lib/events.ts`, which take `userId` explicitly so integration tests can call them without Next.
   - Generation is a **Route Handler** (`POST /api/posts/[postId]/generate/[platform]`) that returns AI SDK 7 `streamText(...).toTextStreamResponse()`. The client reads it with `fetch` and a `ReadableStream` reader, so we don't need `@ai-sdk/react`.
   - The draft is persisted on the server when the stream completes. If the stream aborts, the partial text is discarded and *generation failed* is recorded.
5. **Model.** `lib/ai/model.ts` reads `AI_MODEL`. The default is **`anthropic/claude-sonnet-5.5`**, confirmed on AI Gateway on 2026-11-18. This resolves OQ-2; the spec's `claude-sonnet-5-5` isn't a valid Gateway ID.
   - With `AI_MOCK=1`, the module returns AI SDK's mock language model, for integration tests and Playwright.
   - Gateway auth uses `AI_GATEWAY_API_KEY` locally and OIDC on Vercel.
6. **Draft storage.** `drafts.content` and `drafts.generated_content` are `text[]`:
   - one element for LinkedIn and Bluesky
   - one element per tweet for X

   Per-tweet counts and blank-line joins are then exact, and *edited* is plain array inequality. There's a unique constraint on `(post_id, platform)`.
7. **Other data choices:**
   - `user_id` is `text` with no foreign key into `neon_auth.user`. That keeps Drizzle migrations to the `public` schema and lets integration tests use made-up user IDs.
   - The *Copied* status is derived from whether a `draft_copied` event exists for the post. No extra column is needed.
   - Indexes: `posts(user_id, updated_at)`, `events(user_id, type, created_at)` for the rate limit, and `events(post_id, type)`.
8. **Rate limit.** Before any model call, the server counts the user's `generation_started` events in the last 24 hours. Try-again time = oldest counted event + 24h. Two simultaneous clicks could go up to 2 over the cap; we accept that for 5–10 testers.
9. **Database driver.** `drizzle-orm/neon-http` has no interactive transactions, so `db.batch([...])` is used where writes must land together (draft upsert + *generation completed*).
10. **Tests:**
    - Vitest aliases `server-only` to an empty stub, and `tests/setup.ts` points `DATABASE_URL` at `TEST_DATABASE_URL`.
    - Each test makes its own random user IDs and cleans up after itself, so tests don't depend on each other.
    - Playwright runs `next dev` against the `test` Neon branch with `AI_MOCK=1`.

## Dependencies & setup (packages, migrations, env vars)

**Packages** (all from the spec's expected set, installed together in task 1.1):
- `ai` (7.x)
- `@neon/auth`
- `vitest` (dev)
- `@playwright/test` (dev)

There are no others. Webhook signature checks use `node:crypto`, and scripts run with Node 26's native TypeScript support (no `tsx`).

**Migration:** a single migration, `drizzle/0000_*`, creates all four tables (`allowed_emails`, `posts`, `drafts`, `events`) in task 1.1. No later task changes the schema, so parallel waves can't collide on the database.

**Env vars:**

| Var | Where | Notes |
| --- | --- | --- |
| `NEON_AUTH_BASE_URL` | local, Vercel | From Neon Auth, once enabled |
| `NEON_AUTH_COOKIE_SECRET` | local, Vercel | `openssl rand -base64 32` |
| `AI_MODEL` | optional | Defaults to `anthropic/claude-sonnet-5.5` |
| `AI_MOCK` | tests and E2E only | `1` = mock model |
| `AI_GATEWAY_API_KEY` | local (already set) | OIDC on Vercel |
| `TEST_DATABASE_URL(_UNPOOLED)` | local (already set) | `test` Neon branch |
| `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, `E2E_BLOCKED_EMAIL` | local / CI | The seeded test user on the `test` branch, plus a known non-allowlisted email |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel | Lets the Neon webhook reach protected preview deployments (`?x-vercel-protection-bypass=` on the webhook URL) |

**Neon setup.** Project `levercast-lite` (`bold-butterfly-14083471`). Neon Auth is **not enabled yet** (checked 2026-11-18). This is done in task 1.4, and as outward-facing changes each step is confirmed first:
- enable Neon Auth on `main`
- add the Google provider
- turn on email one-time code sign-in (built-in sender)
- on the `test` branch only: turn on email-and-password sign-in and seed the E2E test user
- add trusted domains (localhost, the Vercel preview pattern, the production domain)

Task 1.5 adds the `user.before_create` webhook.

**Vercel (set up in 1.5, 2026-11-18).** The old `levercast-lite` project no longer existed, so a new one was created in the Switch Dimension team:
- It's connected to the GitHub repo with the Next.js framework preset. Pushes build previews, and `main` builds production.
- Preview env vars (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`) are scoped to `feat/1-post-drafting-mvp` and point at the dev Neon branch. Production vars wait for 5.4.
- Protection Bypass for Automation is on. The secret is in `.env.local` as `VERCEL_AUTOMATION_BYPASS_SECRET`.
- On the dev Neon branch, the trusted domain is the stable branch URL `https://levercast-lite-git-feat-1-post-drafting-mvp-switchdimension.vercel.app`. Neon only allows a whole leftmost-label wildcard, so per-deployment preview URLs aren't trusted; test on the branch URL.
- The `user.before_create` webhook on the dev Neon branch points at that branch URL plus the bypass query parameter. Because local dev shares the dev branch, sign-ups made locally are checked by the preview's webhook too.

**Stale Clerk vars (OQ-3):** none are in `.env.local` now. Vercel still needs checking in task 5.4, and removing anything there is *ask first*.

Database branch: **yes, Neon.**
- Create a `post-drafting-mvp` branch from `main` *after* Neon Auth is enabled on `main`, and use it for local development. Check in task 1.4 that the auth config carries over to the child branch (Neon's "branching authentication" docs); if it doesn't, enable it there too.
- The existing `test` branch (`br-noisy-rain-bb3bx5sn`) serves integration and E2E tests.
- Task 1.1 applies the migration to the `test` branch (`npm run db:migrate:test`). The dev branch doesn't exist until 1.4, so 1.4 migrates it right after creating it and points `DATABASE_URL` at it. `main` is migrated at ship time. Until then, `DATABASE_URL` in `.env.local` points at `main`, so don't run plain `npm run db:migrate`.

## Phase 1 — Foundations and access

- [#2](https://github.com/switch-dimension/levercast-lite/issues/2) 1.1 Test harness, dependencies, and schema · wave 1
- [#3](https://github.com/switch-dimension/levercast-lite/issues/3) 1.2 Ink & Paper app shell · wave 1
- [#4](https://github.com/switch-dimension/levercast-lite/issues/4) 1.3 Platform prompts and model wiring (no UI) · wave 2
- [#5](https://github.com/switch-dimension/levercast-lite/issues/5) 1.4 Neon Auth sign-in, sign-out, and route protection · wave 2
- [#6](https://github.com/switch-dimension/levercast-lite/issues/6) 1.5 Allowlist enforcement and the invite-only notice · wave 3
- [#7](https://github.com/switch-dimension/levercast-lite/issues/7) 1.6 Playwright harness, test sign-in, and the access check · wave 4
- **Checkpoint 1:** `npm test` and `npm run build` are green. A Vercel preview deploys. The founder signs in with Google and with email, a non-allowlisted account is turned away, and sign-out works. `node scripts/prompt-check.ts` runs against the real Gateway. A chance to redirect.

## Phase 2 — Posts

- [#8](https://github.com/switch-dimension/levercast-lite/issues/8) 2.1 The Home writing box creates and autosaves a post · wave 5
- [#9](https://github.com/switch-dimension/levercast-lite/issues/9) 2.2 My posts list and Home's recent cards · wave 6
- [#10](https://github.com/switch-dimension/levercast-lite/issues/10) 2.3 Post editor shell with idea editing · wave 6
- [#11](https://github.com/switch-dimension/levercast-lite/issues/11) 2.4 Delete post with a confirmation dialog · wave 7
- **Checkpoint 2:** tests green; deploy a preview. The founder writes ideas, sees them in the list as *Not generated*, reopens one, edits it, and deletes one. A chance to redirect.

## Phase 3 — Generation

- [#12](https://github.com/switch-dimension/levercast-lite/issues/12) 3.1 Generation endpoint for one platform · wave 8
- [#13](https://github.com/switch-dimension/levercast-lite/issues/13) 3.2 Three streaming panels in the editor · wave 9
- [#14](https://github.com/switch-dimension/levercast-lite/issues/14) 3.3 X thread parsing, counts, and over-limit highlights · wave 10
- **Checkpoint 3:** tests green; deploy a preview. **Prompt-quality check:** the founder supplies 5 real ideas and generates drafts with `scripts/prompt-check.ts` and in the app, then compares them with ChatGPT against AC-13. Iterate `lib/ai/prompts.ts` until the founder would post with light edits. This gates inviting testers; the results go in the verify doc. A chance to redirect.

## Phase 4 — Editing, copying, and regenerating

- [#15](https://github.com/switch-dimension/levercast-lite/issues/15) 4.1 Inline draft editing with autosave · wave 11
- [#16](https://github.com/switch-dimension/levercast-lite/issues/16) 4.2 Copy, Copy thread, and per-tweet Copy, with copy events · wave 12
- [#17](https://github.com/switch-dimension/levercast-lite/issues/17) 4.3 Regenerate and Regenerate all with an inline confirmation · wave 13
- [#18](https://github.com/switch-dimension/levercast-lite/issues/18) 4.4 The "Your idea changed since this draft" note · wave 14
- **Checkpoint 4:** tests green; deploy a preview. The founder runs the full flow on desktop and on a phone: write, generate, edit, copy, regenerate, and change the idea. Spot-check the events table with SQL (AC-24 sequence). A chance to redirect.

## Phase 5 — Hardening and release

- [#19](https://github.com/switch-dimension/levercast-lite/issues/19) 5.1 Edge cases: session expiry and leaving mid-stream · wave 15
- [#20](https://github.com/switch-dimension/levercast-lite/issues/20) 5.2 Accessibility and microcopy pass · wave 15
- [#21](https://github.com/switch-dimension/levercast-lite/issues/21) 5.3 End-to-end happy path · wave 16
- [#22](https://github.com/switch-dimension/levercast-lite/issues/22) 5.4 Release setup · wave 16
- **Checkpoint 5:** full `npm test` plus `npx playwright test` green, build green, prompt-quality check recorded as passed, and production live. Then hand off to **mt-verify**.

## Parallel waves

| Wave | Tasks | Can start when |
| --- | --- | --- |
| 1 | #2 (1.1), #3 (1.2) | Plan approved |
| 2 | #4 (1.3), #5 (1.4) | 1.1 and 1.2 done |
| 3 | #6 (1.5) | 1.4 done |
| 4 | #7 (1.6) | 1.5 done |
| 5 | #8 (2.1) | Checkpoint 1 passed |
| 6 | #9 (2.2), #10 (2.3) | 2.1 done |
| 7 | #11 (2.4) | 2.3 done |
| 8 | #12 (3.1) | Checkpoint 2 passed |
| 9 | #13 (3.2) | 3.1 done |
| 10 | #14 (3.3) | 3.2 done |
| 11 | #15 (4.1) | Checkpoint 3 passed |
| 12 | #16 (4.2) | 4.1 done |
| 13 | #17 (4.3) | 4.2 done |
| 14 | #18 (4.4) | 4.3 done |
| 15 | #19 (5.1), #20 (5.2) | Checkpoint 4 passed |
| 16 | #21 (5.3), #22 (5.4) | 5.1 and 5.2 done (5.4 needs only Checkpoint 4) |

Phases 3 and 4 run in series on purpose: every task touches the draft panel, so splitting them would only cause merge conflicts. Only task 1.1 migrates, so parallel waves never share a schema change.

## Risks & mitigations

- **The allowlist webhook needs a public HTTPS URL.** Neon rejects localhost, and Vercel preview protection blocks unauthenticated POSTs.
  - Previews: add the Vercel automation-bypass query parameter to the webhook URL.
  - Locally: the webhook isn't used; the email-form check and `requireUser()` cover development.
  - The webhook fails closed: if it's down, *new* sign-ups fail, but existing testers aren't affected.
- **Neon Auth is new to this codebase, and `@neon/auth` is 0.x.** Pin the version and follow the Neon quickstart (`docs/auth/quick-start/nextjs-api-only`). If Neon Auth blocks progress, stop at 1.4 and raise it rather than working around it.
- **Cache Components and session reads.** Reading `cookies()` outside `<Suspense>` is a build error. Follow the Next 16 auth-with-cache-components guide in 1.4, and keep `npm run build` in every task's verify step.
- **Prompt quality is the real gate.** Prompts land in 1.3 so the founder can iterate from day 2, not day 6.
- **Deadline (~2026-11-25).** If time is short, cut in this order:
  1. fold 1.6 into 5.3
  2. trim 5.3 to sign-in plus generate plus copy
  3. defer the reduced-motion and narrow-viewport polish in 5.2 (keyboard and `aria-live` stay)
- **Rate-limit race.** Simultaneous clicks can go up to 2 over the cap. We accept that and note it here.

## Noticed during build

Don't log findings here. File each one as a GitHub issue with the `molten` label and add it as a sub-issue of [#1](https://github.com/switch-dimension/levercast-lite/issues/1).

## Definition of done (all acceptance criteria verified)

- Every AC from AC-1 to AC-26 (including AC-8a, AC-12a, AC-22a) has a passing test or a recorded manual check. Coverage:
  - AC-1: 1.4, 1.6
  - AC-2: 1.5, 1.6
  - AC-3: 1.5
  - AC-4: 1.4, 3.1
  - AC-5: 1.4
  - AC-6: 2.1, 2.3
  - AC-7: 2.2, 4.2
  - AC-8: 2.2
  - AC-8a: 2.1
  - AC-9: 2.1
  - AC-10: 2.4
  - AC-11: 2.3, 4.1
  - AC-12: 3.2
  - AC-12a: 4.3
  - AC-13: 1.3 plus checkpoint 3
  - AC-14: 3.3
  - AC-15: 3.3
  - AC-16: 3.1, 3.2, 5.1
  - AC-17: 4.3
  - AC-18: 4.3
  - AC-19: 3.2
  - AC-20: 3.1, 3.2
  - AC-21: 4.1
  - AC-22: 4.2
  - AC-22a: 4.2
  - AC-23: 4.4
  - AC-24: 3.1, 4.2, 4.3
  - AC-25: 4.2
  - AC-26: 5.2
- The prompt-quality check has passed and is recorded.
- Production is deployed with the testers on the allowlist.
- **mt-verify** writes `molten-docs/verify/post-drafting-mvp.md`.
