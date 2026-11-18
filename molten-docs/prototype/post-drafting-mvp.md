---
feature: Post drafting MVP
slug: post-drafting-mvp
created: 2026-11-18
discovery: molten-docs/discovery/post-drafting-mvp.md
spec: molten-docs/spec/post-drafting-mvp.md
prototype_location: molten-docs/prototype/post-drafting-mvp/
molten_next_skill: mt-plan
---

# Prototype — Post drafting MVP

## Question

Which layout makes the path from idea to three drafts to copy feel calm and fast for a consultant who's wary of AI?

We'll know we've answered it when the founder picks a direction (or a mix) for the post list, the post editor, and where each draft's state is shown.

## Approach (medium, what was built, shortcuts taken)

**Medium:** clickable HTML mockups using the Ink & Paper tokens. There's no backend. Data lives in memory plus `sessionStorage`, so edits carry across all three mockups in the same browser tab.

**What was built:**
- `index.html`: a chooser with SVG thumbnails of each layout.
- `notebook.html` (Approach 1, The Notebook): a separate list page, and a one-column editor with the idea at the top and LinkedIn, X and Bluesky stacked below. A sticky strip at the top shows each platform's status and jumps to it.
- `desk.html` (Approach 2, The Desk): a notes-app layout. The post list is a persistent sidebar, the idea sits in the middle pane, and drafts appear one at a time in tabs with status dots.
- `spread.html` (Approach 3, Compose & Spread): home is a big writing box with recent posts below. Generate opens a three-column spread, with the idea folded into a one-line bar and an **Edit idea** button that expands it.
- `hybrid.html` (Approach 4, the chosen direction): the Spread's writing-box home, then the Notebook's vertical editor. Built after the first round of feedback.
- `shared.css` and `shared.js`: tokens, mock data (three seeded posts), a fake streaming generator that reuses the user's own sentences, and draft panel behaviour shared by all three layouts.

**Behaviour covered, and the same in all three layouts:**
- Generate with three independent streams
- Per-platform Regenerate, with an inline confirm when the draft has been edited
- Per-tweet X editing, counts and Copy
- **Copy thread**, which joins tweets with blank lines
- Over-limit highlighting that doesn't block editing or copying
- The "Your idea changed since this draft" note
- Autosave indicators
- Soft delete behind a confirmation dialog
- The empty state

**Prototype controls panel:**
- Make Bluesky fail mid-draft
- Hit the daily limit
- Block the clipboard
- Slow down streaming
- Reset the data, or start from the empty state

**Shortcuts:**
- No auth, events or real model.
- X counts are plain character counts, not X's weighted counting.
- No keyboard-only or screen-reader pass beyond basic tab roles and `aria-live`.
- Mobile layouts were built but not checked in a browser at narrow widths.

## Result — answered? yes

**The founder chose a hybrid** (2026-11-18), built as `hybrid.html` (Approach 4):
- **Home (from the Spread):** the app opens straight into a writing box ("What's been on your mind this week?") with recent posts as cards below it. The founder's words: "I like the way I can go straight to writing a post in this opening page."
- **Post editor (from the Notebook):** after Generate, a vertical layout with the idea at the top, then LinkedIn, X and Bluesky stacked, plus a sticky status strip. The founder preferred this structure after generating: "the vertical format suits mobile."
- **My posts:** a separate full list, reached from the top bar and from "All posts →" on home.
- **The Desk's** persistent sidebar and **the Spread's** three-column editor were not chosen.

Building the mockups also showed several gaps in the spec and design system, listed below.

## What we learned

1. **Streaming conflicts with the design system.** `design.md` rules out "typewriter 'AI is writing…'" effects, but FR-10 requires streaming. The mockups resolve it by:
   - adding a few words at a time, with no caret or blinking cursor
   - a quiet "Writing your LinkedIn draft" label
   - a slow pulsing lavender dot
2. **The spec doesn't say what Generate does once drafts exist.** In the prototype, the main button becomes **Regenerate all**:
   - unedited drafts regenerate immediately
   - each edited draft asks "Keep my edit / Replace it" inline

   This keeps the rule "never auto-overwrite an edited draft" without a blocking modal.
3. **Each platform needs five visible states, whatever the layout:**
   - *Not generated*
   - *Writing*
   - *Draft ready*
   - *Idea changed*
   - *Didn't finish*

   One set of dots and labels covers all three layouts. The Desk needs them most, because drafts finish in tabs you can't see.
4. **When a post gets created matters.** The prototype creates the post the first time a non-empty idea autosaves, not when Generate is clicked. That means *Not generated* posts appear in the list, which matches FR-5. The spec should say this explicitly. It also decides when the *post created* event fires.
5. **The rate-limit unit doesn't match how users think.** "50 platform generations" means nothing to a user. The UI says "You've used today's 50 drafts. You can generate again at 3:10 PM." One click on Generate spends 3.
6. **A failed panel keeps the previous draft** below the error and **Try again**, which satisfies the reliability requirement ("never loses the previous draft").
7. **Editing an X thread is per tweet.** You can't add, remove, split or merge tweets. That's acceptable for the MVP, but testers may ask for it.
8. **What each layout costs:**
   - **Notebook:** mobile comes free. Comparing drafts takes scrolling, and Bluesky can be off-screen while it streams (the status strip covers this).
   - **Desk:** switching between posts is quickest, and the idea stays visible while you edit drafts. You never see all three drafts at once, and it needs its own mobile mode (list or editor).
   - **Spread:** it has the best "three drafts at once" moment. The idea is hidden while you edit, LinkedIn's 3,000 characters in a narrow column is a long scroll, and it needs segmented tabs on mobile.

## Decisions for the spec

**Layout (decided):**
- **UX notes / Screens:** add a **Home** screen with the writing box first, using the empty-state nudge as its heading and up to 4 recent posts as cards. **My posts** becomes a secondary full list. The **post editor** is a single vertical column (idea, then LinkedIn, X and Bluesky stacked) with a sticky strip showing each platform's state and jumping to it. This replaces "tabs or side by side on wide screens", and it's the same layout on desktop and mobile.
- **FR-6:** the home writing box *is* the nudge and the **New post** action, so the list's empty state can just link back to home.

**Also confirmed by the founder (2026-11-18), going with the recommendations:**
- **FR-10:** once drafts exist, Generate becomes **Regenerate all**. It regenerates unedited drafts and asks before replacing each edited one.
- **FR-7:** the post is created on the first autosave of a non-empty idea. *post created* fires at that moment.
- **FR-17 copy:** the user-facing unit is "drafts" ("today's 50 drafts").
- **UX notes:** define the five per-platform states and their labels. Streaming adds a few words at a time with a quiet label and no caret, in line with `design.md`'s motion rules.
- **UX notes:** the regenerate confirmation is shown inline in the panel. Delete uses a modal dialog.


## Remaining unknowns

- In the vertical editor, Bluesky sits below the fold while drafts are written. Is the status strip enough to show it's working? Check with testers.
- Adding, removing or splitting tweets in an X thread (likely after the MVP).
- A narrow-viewport and keyboard-only pass of the chosen layout (already in the spec's manual testing).
