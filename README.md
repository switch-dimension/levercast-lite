# Levercast Lite

Write a rough idea once and get drafts for LinkedIn, X and Bluesky to edit and copy. Invite-only while it's in testing.

Stack: Next.js 16 (App Router), Neon Postgres with Drizzle, Neon Auth (Google or an emailed code), AI SDK through Vercel AI Gateway, Tailwind CSS. Deployed on Vercel.

## Run it locally

You need Node 26 (scripts use its built-in TypeScript support) and access to the `levercast-lite` Neon project.

```bash
npm install
cp .env.example .env.local   # then fill it in; each variable is explained there
npm run dev                  # http://localhost:3000
```

Use the `post-drafting-mvp` dev branch for `DATABASE_URL` and `NEON_AUTH_BASE_URL`, never `main` (that's production). To sign in locally, your email has to be on the dev branch's allowlist (see [Add a tester](#add-a-tester)).

Generating drafts calls the real model through AI Gateway. Set `AI_MOCK=1` to use a canned mock model instead.

### Database changes

The schema lives in `db/schema.ts`, with migrations in `drizzle/`.

```bash
npm run db:generate       # write a migration from schema changes
npm run db:migrate        # apply to the branch in DATABASE_URL
npm run db:migrate:test   # apply to the test branch
```

## Test

Tests run against the separate `test` Neon branch (the `TEST_*` variables), so they never touch dev or production data.

```bash
npm test                  # unit and integration tests (Vitest)
npm run test:e2e          # end-to-end tests (Playwright, mock model)
npm run lint
npx tsc --noEmit
```

Playwright starts its own `next dev` on port 3100, with its own build folder, so it can run alongside your dev server. On first run it creates the E2E user on the test branch and adds it to that branch's allowlist.

`npm run prompt-check -- ideas.txt` generates all three drafts for each idea in a file (ideas separated by a `---` line) with the real model, and writes them to a markdown file to read side by side. Drafts over a platform's limit are flagged. It spends tokens.

## Add a tester

Access is an email allowlist in the `allowed_emails` table. Emails are matched case-insensitively, and removing one revokes access straight away.

```bash
npm run allow-email -- jo@example.com "Jo, tester"   # invite (or update the note)
npm run allow-email -- --remove jo@example.com       # revoke
npm run allow-email -- --list                        # list
```

This changes the branch in `DATABASE_URL` (your dev branch). For production, point it at `main` for one run, using the direct connection string from the Neon Console:

```bash
DATABASE_URL="<main branch connection string>" npm run allow-email -- jo@example.com "Jo, tester"
```

The tester then signs in with Google or an emailed code using that address. Anyone else sees an invite-only notice and no account is created.

The allowlist is checked in three places:
- the sign-in form, before sending a code
- every page, Server Action and API request
- a Neon Auth `user.before_create` webhook, so uninvited Google sign-ups get no account

The webhook only runs on deployments, because Neon can't reach `localhost`.

## Deploy

Vercel builds a preview for every push and deploys `main` to production. Each environment needs its own Neon branch and settings:

| | Preview | Production |
| --- | --- | --- |
| Neon branch | `post-drafting-mvp` | `main` |
| Vercel env vars | `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` | the same four, for `main` |
| Neon Auth trusted domain | the branch's stable preview URL | the production URL |
| Neon Auth webhook (`user.before_create`) | `<preview URL>/api/webhooks/neon-auth?x-vercel-protection-bypass=<secret>` | `<production URL>/api/webhooks/neon-auth` |

If Vercel Deployment Protection covers a deployment, Neon's webhook needs the `?x-vercel-protection-bypass=<secret>` parameter to reach it (the secret is `VERCEL_AUTOMATION_BYPASS_SECRET`). Testers also need production on a URL that isn't protected, either a custom domain or protection limited to previews.

On Vercel, the model is reached through AI Gateway with OIDC, so no API key is needed. Run `npm run db:migrate` against `main` before the first production deploy, and before any deploy that brings a new migration.
