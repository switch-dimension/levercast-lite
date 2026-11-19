---
feature: Post drafting MVP
slug: post-drafting-mvp
created: 2026-11-19
spec: molten-docs/spec/post-drafting-mvp.md
reviewed_commit: 194d0d3
reviewers: spec (fresh context, fable), quality (fresh context, fable), second opinion: Codex CLI 0.169.0 (read-only sandbox, Quality brief)
recommendation: request-changes
molten_next_skill: mt-build
---

# Review — Post drafting MVP

Scope: `git diff 76d432f...194d0d3`, the `feat/1-post-drafting-mvp` branch against the `main` commit it merged into (PR #24, merged as `399eeba`). The application code at `main` (`848770e`) is identical to `194d0d3`; only skills and docs changed after the merge. The checkout was clean. This replaces the earlier single-context review, which was deleted when mt-review moved to two reviewers.

The diff is about 10k lines (around 5k of app code and tests, plus the lockfile and the Drizzle snapshot), far over the ~300-line guideline. It has already merged, so splitting it no longer applies; future features should land in smaller PRs.

Verify is **partial**. Only AC-13 (the founder's prompt-quality read) is outstanding, so the review went ahead.

## Intent

Build the Levercast post-drafting MVP from an empty Next.js 16 scaffold for 5–10 invited testers. Users sign in with Neon Auth (Google or an email one-time code), gated by an `allowed_emails` allowlist that the server enforces in three places: a signed `user.before_create` webhook, the email sign-in action, and `requireUser()` on every request. They type a rough idea on Home, which autosaves as a post. One click generates LinkedIn, X-thread and Bluesky drafts in parallel, each streamed from its own Route Handler call. Each draft can be edited with autosave, copied (whole draft, whole thread, or one tweet), and regenerated per platform or all at once, never replacing an edited draft without an inline confirmation. A draft shows a note when the idea changed after it was generated. Posts are soft-deleted. Each user can run 50 platform generations per rolling 24 hours. Events record generations and copies, with generated and final text, for the founder to query, and the UI never shows them. Nothing is published.

## Summary

Spec: **fail**. "Try again" replaces an edited draft without asking (FR-15, Boundaries: "Never auto-overwrite a user's edited draft").
Quality: **fail**. Returning to Home after Generate brings back the old idea box, with Generate stuck on "Opening…", and typing a new idea overwrites the previous post.

This is a careful, well-tested build. Security is solid: the webhook, the DAL and per-user scoping hold up. The two blockers are both client-state bugs with small fixes, and both are paths the E2E suite never reaches. They should be fixed before more testers are invited.

## Spec findings

### Blockers

- `components/editor/post-editor.tsx:129`: **"Try again" skips the edited-draft check.**
  - **What:** When a run fails, `DraftPanel` shows the error with Try again and, alongside it, the previous draft, which can still be edited (`components/editor/draft-panel.tsx:75-97`). `onRetry` calls `generate([platform])` directly instead of `regenerate(platform)`, which is the path that checks `isEdited` and asks Keep my edit / Replace it.
  - **Path:** a regenerate fails → the user edits the draft that's still showing → Try again → `DraftBody` unmounts and flushes the edit → the new generation overwrites it. No confirmation appears.
  - **Why it matters:** the user loses their edit, which the spec explicitly forbids. No test covers it.
  - **Fix:** `onRetry={() => regenerate(platform)}`, plus an E2E test: fail, edit, Try again, then expect the inline confirmation.
  - Raised by: spec, second opinion.
  - Quoted spec: "If the user has edited that draft since it was generated, they must confirm first, because their edit will be replaced." (FR-15). "Never: auto-overwrite a user's edited draft" (Boundaries).

### Suggestions

- `components/editor/post-editor.tsx:58-62`: **Panel Regenerate, including the stale note's button, doesn't save a pending idea edit first.**
  - **What:** Regenerate all flushes the idea autosave before generating (`components/idea-box.tsx:22-35`). `regenerate()` calls `generate` straight away. Edit the idea and click a panel's Regenerate within the ~1 s debounce, and the server writes from the old idea. When the save then lands, the "idea changed" note comes straight back.
  - **Why it's a Suggestion, not a Blocker:** no user text is lost, the window is about a second, and the stale note makes the result visible.
  - **Fix:** give every generation entry point one shared "flush the idea, then generate" step that stops if the save fails.
  - Raised by: spec, second opinion (Codex rated it a blocker).
  - Quoted spec: "Generate drafts saves the idea and then generates" (FR-10). "Regenerating a draft clears its note." (AC-23).

## Quality findings

### Blockers

- `components/idea-box.tsx:38-40, 54-58, 72`: **Home's idea box keeps its old idea, post ID and "Opening…" state after navigation, so the next idea overwrites the previous post.**
  - **Cause:** `cacheComponents: true` keeps visited routes alive in `<Activity>` instead of unmounting them. Per `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`, "Next.js preserves up to 3 routes". The code already relies on this elsewhere (`hooks/use-autosave.ts:86`, `app/(app)/actions.ts:16`), but Home's `IdeaBox` never resets after it hands off to the editor.
  - **Path:**
    1. Type idea A on Home. Autosave creates post P.
    2. Click Generate. `opening` becomes `true`, and `router.push('/posts/P?generate=1')` runs.
    3. Click the Levercast logo (`<Link href="/">`, `app/(app)/layout.tsx:13`) or "Back to Home" on My posts. Home comes back showing A, with the button stuck on a disabled "Opening…" and `postIdRef.current === P`.
    4. Clear the box and type idea B. `onChange` sees a post ID, so autosave calls `saveIdea(P, …)`. Post P's idea is replaced with B, P's drafts all go stale, and no new post is created.
    5. If P was deleted in between, `saveIdea` throws "Post not found" and Home shows "Couldn't save" until the page is reloaded.
  - **Why it matters:** the second idea of a session silently destroys the first, which breaks FR-7 ("The post is created the first time a non-empty idea is saved"). Generate stays disabled until a full reload. Every E2E spec reaches Home with `page.goto` (a full load), so the suite can't see this.
  - **Fix:** reset Home's box after a successful hand-off: clear `idea` and `postIdRef`, cancel the autosave, and set `opening` back to `false`. The docs also suggest keying the subtree on `useRouter().bfcacheId`. Add an E2E test that generates, clicks the logo back to Home, types, and checks that a new post was created and P is unchanged.
  - Raised independently by: quality, second opinion.
  - Spec status: not verified in a browser. It's confirmed from the code and the installed Next.js docs. A 30-second manual check on production would confirm it.

### Suggestions

- `app/api/auth/[...path]/route.ts:3`: **The email-code allowlist check can be bypassed for sending.**
  - **What:** `auth.handler()` proxies every `/api/auth/*` path to Neon Auth (`@neon/auth` 0.8.2), including `email-otp/send-verification-otp`. Anyone can POST an arbitrary email there and Neon's sender emails it a code. `sendSignInCode`'s check only covers the app's own form.
  - **Why it's not a Blocker:** account creation is still refused by the webhook, and access by `requireUser()`, so FR-2's "no account or session" still holds. What's left is a spam and abuse path, and the plan's promise that uninvited people "get no email" doesn't hold.
  - **Fix:** return 404 from the route for `email-otp/send-verification-otp`; the Server Action calls Neon Auth server-side, not through this route. Also look for a Neon Auth setting that refuses OTP sign-in for unknown users, because the upstream Neon Auth URL can be called directly.
  - Raised by: quality, second opinion.
- `lib/ai/generate.ts:43-55`: **The rate-limit overshoot is up to N−1, not 2.**
  - **What:** the count and the `generation_started` insert aren't atomic. A tester sending N concurrent POSTs (curl, or several tabs) gets all N through when the count is just under 50. The plan's "up to 2 over the cap" only holds for clicks in the UI.
  - **Fix:** insert `generation_started` first, then count the window including that row, and refuse if it's over the cap. This fails closed without interactive transactions.
  - At minimum, correct the trade-off in the plan.
  - Raised by: quality.
- `components/editor/draft-panel.tsx:120-131` with `hooks/use-autosave.ts:84-101`: **an unmount save can land after a fresh generation.**
  - **What:** starting a generation unmounts `DraftBody`, whose cleanup fires the pending save without waiting for it. Generation runs over a Route Handler `fetch`, which the Server Action queue doesn't order. If the save finishes after `saveGeneratedDraft`, `updateDraftContent` writes the old edit over the new draft, because it has no generation revision check.
  - **How likely:** rare in practice, since a real generation takes more than 1 s and the confirmation usually outlasts the debounce. But the comment at `draft-panel.tsx:121-122` ("never after it") overstates the guarantee.
  - **Fix:** await the panel's pending save before starting the fetch, or make draft saves conditional on `generated_at`.
  - Raised by: second opinion. Rated plausible, not reproduced.

### Nits

- Nit: `lib/ai/model.ts:5,16`: nothing guards `AI_MOCK` in production, and `ai/test` is always in the server bundle. If `AI_MOCK=1` ever reached Vercel's production env, testers would silently get canned drafts. Ignore the flag when `VERCEL_ENV === "production"`, and import the mock only when it's on. (quality)
- Nit: `lib/drafts.ts:67-83`: `saveGeneratedDraft` is the only write that isn't scoped with `owned()`, so a draft and its `generation_completed` event are written to a post soft-deleted mid-stream. It's harmless, but inconsistent with the rest of the data layer. (quality)
- Nit: `components/editor/post-editor.tsx:80-89`: `?generate=1` calls `generate(PLATFORMS)` without `planRegenerateAll`. So a hand-typed `?generate=1` on a post with edited drafts replaces them without asking. Only the user's own URL reaches this, but making auto-start use the same plan would close it. (quality)
- Nit: Activity can also restore a hidden `PostEditor` for a post deleted since, through browser Back, and every edit then shows "Couldn't save". The root cause is the same as the Home blocker. (quality)

## Praise

- **Webhook verification is done properly:**
  - Ed25519 detached JWS over the raw body
  - `alg` and key-type checks
  - a ±5-minute window
  - one JWKS refresh for an unknown `kid`
  - every error path fails closed (`lib/auth/webhook-signature.ts`)
- **Allowlist enforcement holds up in depth.** `requireUser()` re-checks the session, `emailVerified` and the allowlist on every request, so removing an email revokes access at once. (Raised by both the quality reviewer and the second opinion as checked.)
- **IDOR protection is consistent.** Every query goes through `owned()` or an owner join, with a UUID guard in front, so another user's post is indistinguishable from a missing one.
- **The in-band stream result (`lib/domain/draft-stream.ts`) is a sharp fix for a real problem.** Chrome was silently retrying failed POSTs, and each retry was a new model call. Aborts and cancels record `generation_failed` and close cleanly.
- **The ms-vs-µs staleness comparison in `saveGeneratedDraft` is a subtle edge that was handled correctly.**
- **The tests are broad and real:** 103 unit and integration tests against a real Neon `test` branch, and 40 Playwright specs. The verify report traced every AC except AC-13 to a test.
- **Comments explain why, not what,** for example on the proxy matcher, the Activity behaviour in autosave, and the drizzle column-qualification workaround.

## Dismissed

- **AC-2 for a removed tester who signs in with Google** (they get a Neon session that the app refuses). Raised by spec as a question. Dropped because plan decision 3 chose this split on purpose: the webhook blocks new accounts and `requireUser()` blocks removed users on every request. A refused session gives no access.
- **Copy writes the draft outside the autosave queue and can roll back a newer edit.** Raised by quality. Dropped because Next.js dispatches Server Actions one at a time per client (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md`, "Sequential dispatch"), so the copy is ordered ahead of any later autosave. A residual case needs a flush taking over 1 s while the user keeps typing, with no reachable path in normal use. Dropping the redundant content write from `recordDraftCopied` would still be a reasonable tidy-up.
- **Quality's step 5 of the Home blocker** ("Generate again replaces P's edited drafts without asking"). Not reachable that way, because Home's Generate stays disabled ("Opening…") once the box comes back. The `?generate=1` part is kept above as a nit.
- **The webhook timestamp might be in seconds, not milliseconds.** Raised by quality as unconfirmed. Ruled out in practice: real Google sign-ups and refusals went through this webhook on the preview (checkpoint 1) and on production, which a unit mismatch would have broken by failing closed.

## Recommendation

**Request changes.** Fix the two blockers through **mt-build**, then re-run **mt-verify**:

1. [#25](https://github.com/switch-dimension/levercast-lite/issues/25): reset Home's idea box after it hands off to the editor, with an E2E test that returns to Home by client-side navigation.
2. [#26](https://github.com/switch-dimension/levercast-lite/issues/26): route Try again through `regenerate()`, with an E2E test for fail → edit → Try again.

The feature is already merged and live, so treat these as fixes before inviting more testers (alongside #23). The panel-Regenerate idea flush and the OTP-send route block are cheap, worth doing in the same pass.
