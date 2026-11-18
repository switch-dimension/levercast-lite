---
feature: Post drafting MVP
slug: post-drafting-mvp
created: 2026-11-18
molten_next_skill: mt-spec
---

# Discovery — Post drafting MVP

## Problem

Solo B2B consultants have plenty of ideas but rarely turn them into posts. Writing a polished post feels like too much effort, so they post nothing. This MVP tests one core assumption: **a tool that turns rough written thoughts into polished, platform-ready drafts is useful enough that consultants come back and post what it produces.**

## Users & context

- **Who:** the founder plus 5–10 invited solo B2B consultants from the founding waitlist (persona: "The Frozen Expert" in `molten-docs/brand/brand.md`).
- **Trigger:** a consultant has an idea, from a client call, a walk, or project work, and wants it posted without facing a blank page.
- **What they do today:** post nothing, paste the idea into ChatGPT and get generic output, or write slowly by hand.
- **Device:** desktop-first.

## Desired outcome / success signals

- **Pass looks like:** testers return on their own, without being nudged, over the test period, and copy drafts out to post with only light edits.
- **Observed via in-app signals, read straight from the database (no admin UI):**
  - when each post is created and when it is generated
  - when each draft is copied to the clipboard, and for which platform
  - the original generated text kept alongside the final text at copy time, to measure how much testers edited
- **Supplemented by:** direct conversations with testers.

## Key flows

**Happy path**
1. A tester signs in with Google or email. Their email must be on the allowlist.
2. They land on **My posts**: a list of their posts showing the idea preview, date, and status (e.g. Draft, Copied).
3. They click **New post** and type their rough thoughts as plain text.
4. They click **Generate**. The app makes three drafts:
   - **LinkedIn**: a single post
   - **X**: a thread
   - **Bluesky**: a post
5. The drafts appear side by side or in tabs. For each draft, the tester can:
   - edit it inline
   - **regenerate** just that platform's draft
   - **copy to clipboard**, which records a copy event and snapshots the final text
6. The post is saved and appears in the list. The tester can reopen it later to edit, regenerate, or copy again.

**Most likely failures**
- **Email not on the allowlist:** a clear, polite "this is invite-only for now" message.
- **Generation fails or times out:** a plain, responsible error message per the brand voice, with a retry button. The rough idea is never lost.
- **Idea too thin to draft well:** in this version the prompt does its best. Asking a clarifying question is a later improvement (see Out of scope).

## Constraints

- **Stack:** Next.js 16.4.6 (App Router, `cacheComponents` and `partialPrefetching` enabled), React 19.3, Tailwind 4, TypeScript. Per `AGENTS.md`, read `node_modules/next/dist/docs/` before writing code, because the APIs differ from older Next.js.
- **Database:** Neon Postgres via Drizzle (`drizzle-orm/neon-http`). The schema is currently empty.
- **Auth:** Neon Auth, which is built on Better Auth. Invite-only through an email allowlist, with Google and/or email sign-in.
- **AI:** Vercel AI Gateway for completions. `AI_GATEWAY_API_KEY` already exists in `.env.local`. The AI SDK is not installed yet.
- **Prompting:** one fixed prompt per platform, the same for every user, with no personalisation. The prompts must follow the brand's product rules: no generic hooks or engagement bait, no AI-sounding phrasing ("As an expert…", emoji-bullet templates), and keep the user's phrasing and opinions.
- **Design:** reuse the Ink & Paper tokens from `molten-docs/design/design.md`. Newsreader serif for the user's idea and drafts, Geist sans for interface controls. Make sensible app-UI decisions during the build; no separate design pass.
- **Deadline:** in testers' hands within about a week (by ~2026-11-25), in line with the validation test deadline of 2026-12-01. Keep everything as thin as possible.
- **Cost and safety:** the allowlist limits AI spend and data exposure to known testers.

## Out of scope

- Voice-note input. The brand leads with voice; this MVP is text only.
- Style learning or a per-user style profile ("sounds like you" is not tested in this MVP)
- Publishing, scheduling, or connecting social accounts
- Images or media
- Admin dashboard or per-tester stats page
- Thumbs up/down or other in-app draft rating
- Asking clarifying questions when an idea is thin
- Wiring the waitlist landing page signup (`molten-docs/landing/`)
- Billing and payments
- Platforms beyond LinkedIn, X, and Bluesky

## Codebase context (files, patterns, services to reuse)

- `db/index.ts`: Drizzle client on `@neondatabase/serverless` (neon-http), marked `server-only`.
- `db/schema.ts`: empty. Add the posts, drafts, events, and allowlist tables here (plus whatever tables auth needs).
- `drizzle.config.ts` and the `db:generate` / `db:migrate` / `db:push` / `db:studio` scripts.
- `app/layout.tsx`: loads Geist through `next/font`. Newsreader needs to be added. The metadata is still the create-next-app default.
- `app/page.tsx`: still the create-next-app starter. It will be replaced.
- `molten-docs/design/design.md` and `example.html`: the token source (colours, type scale, components).
- `molten-docs/brand/brand.md`: voice, microcopy rules, words to avoid. Use these for UI copy and the generation prompts.
- `.env.local`: has `DATABASE_URL`, `TEST_DATABASE_URL` (a separate test DB), and `AI_GATEWAY_API_KEY`. It also has leftover `CLERK_*` keys and an E2E Clerk test user, which are stale now that auth is Neon Auth.
- The project is linked to Vercel (`.vercel/project.json`).

## Facts / Assumptions / Open questions

**Facts**
- The validation score (`molten-docs/validate/product-score-1.md`) was 17/50, "kill as framed". The brand brief adopted the pivot to solo B2B consultants with the writing job first.
- The test group is the founder plus 5–10 invited waitlist consultants.
- Auth is Neon Auth (Better Auth), invite-only through an allowlist, with Google or email.
- Input is text only. Output is LinkedIn, an X thread, and Bluesky. There's no publishing, only copy to clipboard.
- One post is one idea plus three drafts. Each draft can be edited inline, regenerated individually, and copied.
- Generation uses one fixed prompt per platform through Vercel AI Gateway.
- Signals: created and generated timestamps, copy events per platform, and generated vs. final text at copy time.
- The UI reuses the Ink & Paper tokens.
- The target is testers within about a week.

**Assumptions**
- Good, brand-aligned prompting alone can produce drafts noticeably better than pasting into ChatGPT.
- Copying a draft is a reasonable stand-in for posting it, since the app can't see whether the user actually posted.
- Testers will use desktop.
- 5–10 testers over 1–2 weeks give enough signal to decide whether to continue.

**Open questions (for the spec)**
- Which model to use through AI Gateway, and whether to stream drafts or return them all at once.
- Does Generate make all three platforms in one call or in three parallel calls? (This affects per-platform regenerate and the failure behaviour.)
- Exact rules for an X thread (tweet count, character limits per tweet, numbering) and Bluesky's 300-character limit.
- Does editing the rough idea after generating mark the drafts as stale or prompt a regenerate?
- How the allowlist is managed: a database table seeded by hand, an environment variable, or a Neon Auth setting.
- Should we delete the stale Clerk variables and E2E user from `.env.local` and the Vercel env?
- Do posts need delete or archive in this version?

## Riskiest unknown

**Draft quality (UX/value).** With one generic prompt per platform and no personalisation, drafts may read like ChatGPT output, and testers won't see a reason to come back. The prompts are the product in this MVP. They need deliberate effort and a quick quality check against real rough ideas before testers see them.

## Recommended next step

**mt-spec**: turn this into a testable spec covering the data model (posts, drafts, copy events, allowlist), the generation contract per platform, the auth/allowlist flow, and acceptance criteria. No prototype or mockup detour is needed: feasibility is low-risk and the UX is simple. The spec should include a small prompt-quality check, for example running 5 real rough ideas through the prompts and comparing them side by side with ChatGPT, as an early build task.
