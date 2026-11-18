/* Levercast prototype — shared mock data, fake generation, and draft panel behaviour.
   Throwaway. No backend: everything lives in memory + sessionStorage. */
window.LC = (() => {
  const PLATFORMS = [
    { id: "linkedin", name: "LinkedIn", limit: 3000 },
    { id: "x", name: "X", limit: 280 },
    { id: "bluesky", name: "Bluesky", limit: 300 },
  ];
  const P = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]));
  const STORE_KEY = "lc-proto-v1";
  const MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;

  // ---------- Seed data ----------
  function seed() {
    const now = Date.now();
    const deckIdea =
      "Most clients don't need a strategy deck. They need someone to tell them which two things to stop doing. I've written maybe forty decks in my career and I'd guess three changed anything. The ones that worked were short, and they all had a 'stop doing' list on page one. If I started again I'd lead with the stop list and skip the deck.";
    const deckLinkedIn =
      "Most clients don't need a strategy deck.\n\nThey need someone to tell them which two things to stop doing.\n\nI've written maybe forty decks in my career. I'd guess three of them changed anything.\n\nThe three that worked had something in common. They were short, and each one had a \"stop doing\" list on page one.\n\nEverything after that page was supporting evidence. Useful, but it wasn't what moved the client.\n\nIf I started again, I'd lead with the stop list and skip most of the deck.";
    const deckX = [
      "1/ Most clients don't need a strategy deck. They need someone to tell them which two things to stop doing.",
      "2/ I've written maybe forty decks in my career. I'd guess three changed anything.",
      "3/ The three that worked were short, and each had a \"stop doing\" list on page one. The rest was supporting evidence.",
      "4/ If I started again, I'd lead with the stop list and skip most of the deck.",
    ];
    const deckBsky =
      "Most clients don't need a strategy deck. They need someone to tell them which two things to stop doing. Of the forty or so decks I've written, the three that worked all led with a stop list on page one.";

    const priceIdea =
      "Hourly pricing punishes you for getting good. The faster I solve a problem, the less I earn. Moved two retainer clients to fixed-scope projects last quarter and both said they preferred it because they could budget. One thing I got wrong: I didn't define what 'done' means, so scope crept. Write the done list before the price. Also worth saying: one client pushed back hard at first.";
    const priceLinkedInGen =
      "Hourly pricing punishes you for getting good.\n\nThe faster I solve a problem, the less I earn. That's a strange deal to offer someone who hired you for your experience.\n\nLast quarter I moved two retainer clients to fixed-scope projects. Both said they preferred it, mostly because they could finally budget.\n\nOne thing I got wrong: I never defined what \"done\" meant. So the scope crept, a little every week.\n\nThe fix is boring. Write the done list before you write the price.";
    const priceXGen = [
      "1/ Hourly pricing punishes you for getting good. The faster I solve a problem, the less I earn.",
      "2/ Last quarter I moved two retainer clients to fixed-scope projects. Both preferred it, mostly because they could finally budget.",
      "3/ What I got wrong: I never defined what \"done\" meant, so scope crept a little every week.",
      "4/ Write the done list before you write the price.",
    ];
    const priceXEdited = [
      priceXGen[0],
      priceXGen[1],
      "3/ What I got wrong: I never defined what \"done\" meant, so scope crept a little every week. An extra call here, a quick tweak there, one more stakeholder to keep happy. None of it was big on its own, but by month two we were doing a different project at the same price.",
      priceXGen[3],
    ];
    const priceBsky =
      "Hourly pricing punishes you for getting good. I moved two clients to fixed scope last quarter and both preferred it. My mistake: no definition of done, so scope crept. Write the done list before the price.";

    const gen1 = now - 2 * HOUR - 4 * MIN;
    const gen2 = now - 26 * HOUR;
    return [
      {
        id: "p1", idea: deckIdea, createdAt: now - 2 * HOUR - 10 * MIN, updatedAt: now - 2 * HOUR,
        ideaUpdatedAt: gen1 - MIN, copied: true,
        drafts: {
          linkedin: { content: deckLinkedIn, generated: deckLinkedIn, generatedAt: gen1 },
          x: { content: deckX.slice(), generated: deckX.slice(), generatedAt: gen1 },
          bluesky: { content: deckBsky, generated: deckBsky, generatedAt: gen1 },
        },
      },
      {
        id: "p2", idea: priceIdea, createdAt: now - 27 * HOUR, updatedAt: now - 25 * HOUR,
        ideaUpdatedAt: now - 25 * HOUR, copied: false,
        drafts: {
          linkedin: { content: priceLinkedInGen.replace("The fix is boring.", "The fix is boring, but it works."), generated: priceLinkedInGen, generatedAt: gen2 },
          x: { content: priceXEdited, generated: priceXGen.slice(), generatedAt: gen2 },
          bluesky: { content: priceBsky, generated: priceBsky, generatedAt: gen2 },
        },
      },
      {
        id: "p3",
        idea: "Leeds workshop notes: the real blocker wasn't the CRM, it was that nobody owned the handoff between sales and delivery. Everyone assumed someone else had it. Three teams, one gap, and a very expensive piece of software getting the blame.",
        createdAt: now - 3 * DAY, updatedAt: now - 3 * DAY, ideaUpdatedAt: now - 3 * DAY, copied: false, drafts: {},
      },
    ];
  }

  // ---------- State ----------
  const defaultFlags = { failBluesky: false, rateLimited: false, clipboardBlocked: false, slow: false };
  let state = load() || { posts: seed(), flags: { ...defaultFlags } };
  const ui = {}; // transient per post+platform: { status, stream, error, confirming, notice, timer }
  let variant = 1;
  let saveTimer;

  function load() {
    try { const raw = sessionStorage.getItem(STORE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {} }, 200);
  }
  function u(postId, pid) { return (ui[postId + ":" + pid] ||= { status: "idle", stream: "", error: "", confirming: false, notice: "" }); }

  const hooks = { refresh() {}, postChanged() {}, reset() {} };

  // ---------- Posts ----------
  const posts = () => state.posts.filter((p) => !p.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt);
  const getPost = (id) => state.posts.find((p) => p.id === id && !p.deletedAt) || null;
  function createPost(idea) {
    const now = Date.now();
    const post = { id: "p" + now.toString(36), idea, createdAt: now, updatedAt: now, ideaUpdatedAt: now, copied: false, drafts: {} };
    state.posts.push(post);
    persist();
    return post;
  }
  function deletePost(id) { const p = state.posts.find((x) => x.id === id); if (p) { p.deletedAt = Date.now(); cancelAll(); persist(); } }
  function postStatus(post) {
    if (!Object.keys(post.drafts).length) return { key: "none", label: "Not generated" };
    if (post.copied) return { key: "copied", label: "Copied" };
    return { key: "draft", label: "Draft" };
  }
  const statusPill = (post) => { const s = postStatus(post); return `<span class="status status-${s.key}">${s.label}</span>`; };
  const preview = (idea, n = 120) => { const t = idea.replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n).trimEnd() + "…" : t || "Untitled idea"; };

  // ---------- Derived draft state ----------
  const textOf = (c) => (Array.isArray(c) ? c.join("\n\n") : c);
  const isEdited = (d) => d && textOf(d.content) !== textOf(d.generated);
  const isStale = (post, d) => d && post.ideaUpdatedAt > d.generatedAt;
  function draftState(post, pid) {
    const s = u(post.id, pid).status;
    if (s === "writing") return "writing";
    if (s === "failed") return "failed";
    const d = post.drafts[pid];
    if (!d) return "empty";
    return isStale(post, d) ? "stale" : "ready";
  }
  const STATE_LABEL = { writing: "Writing…", failed: "Didn't finish", empty: "Not generated", stale: "Idea changed", ready: "Draft ready" };
  const anyWriting = (post) => post && PLATFORMS.some((p) => u(post.id, p.id).status === "writing");
  const hasDrafts = (post) => post && Object.keys(post.drafts).length > 0;

  // ---------- Idea validity ----------
  function ideaCheck(text) {
    const t = text.trim();
    if (!t) return { ok: false, msg: "" };
    if (text.length > 5000) return { ok: false, msg: `That's ${(text.length - 5000).toLocaleString()} characters over the 5,000 limit. Trim it a little to generate.` };
    return { ok: true, msg: "" };
  }
  function saveIdea(post, text) {
    const t = text.trim();
    if (!post || t === post.idea) return false;
    post.idea = t;
    post.ideaUpdatedAt = post.updatedAt = Date.now();
    persist();
    PLATFORMS.forEach((p) => refresh(post.id, p.id));
    hooks.postChanged(post);
    return true;
  }

  // ---------- Mock generator (keeps the user's own sentences) ----------
  function sentencesOf(idea) {
    const s = idea.replace(/\s+/g, " ").trim();
    return (s.match(/[^.!?]+[.!?]+["')\]]?|[^.!?]+$/g) || [s]).map((x) => x.trim()).filter(Boolean);
  }
  function mockDraft(idea, pid, v) {
    const ss = sentencesOf(idea);
    if (pid === "linkedin") {
      const paras = [ss[0]];
      const size = v % 2 ? 1 : 2;
      for (let i = 1; i < ss.length; i += size) paras.push(ss.slice(i, i + size).join(" "));
      return paras.join("\n\n").slice(0, 3000);
    }
    if (pid === "x") {
      const max = v % 2 ? 200 : 260;
      let tweets = [], cur = "";
      for (const s of ss) {
        if (cur && (cur + " " + s).length > max) { tweets.push(cur); cur = s; } else cur = cur ? cur + " " + s : s;
      }
      if (cur) tweets.push(cur);
      if (tweets.length < 2 && ss.length >= 2) {
        const mid = Math.ceil(ss.length / 2);
        tweets = [ss.slice(0, mid).join(" "), ss.slice(mid).join(" ")];
      } else if (tweets.length < 2) {
        const words = tweets[0].split(" "), mid = Math.ceil(words.length / 2);
        tweets = [words.slice(0, mid).join(" "), words.slice(mid).join(" ") || "That's the whole thought."];
      }
      return tweets.slice(0, 6).map((t, i) => `${i + 1}/ ${t}`);
    }
    const start = ss.length > 2 ? v % 2 : 0;
    let out = "";
    for (const s of ss.slice(start)) { if ((out + " " + s).trim().length > 295) break; out = (out + " " + s).trim(); }
    if (!out) out = ss[0].slice(0, 296).replace(/\s+\S*$/, "") + "…";
    return out;
  }

  // ---------- Generation ----------
  function resetTime() {
    const d = new Date(Date.now() + 3 * HOUR + 20 * MIN);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const limitMsg = () => `You've used today's 50 drafts. You can generate again at ${resetTime()}.`;

  /** Regenerates every platform. Unedited drafts start at once; edited ones ask first. */
  function generateAll(post) {
    if (state.flags.rateLimited) return { refused: limitMsg() };
    PLATFORMS.forEach((p, idx) => {
      const d = post.drafts[p.id];
      if (d && isEdited(d)) { u(post.id, p.id).confirming = true; refresh(post.id, p.id); }
      else start(post, p.id, idx);
    });
    return { refused: null };
  }
  function regenerate(post, pid, force) {
    const st = u(post.id, pid);
    if (st.status === "writing") return;
    if (state.flags.rateLimited) { st.notice = limitMsg(); refresh(post.id, pid); return; }
    if (!force && isEdited(post.drafts[pid])) { st.confirming = true; refresh(post.id, pid); return; }
    start(post, pid, 0);
  }
  function start(post, pid, idx) {
    const st = u(post.id, pid);
    if (st.status === "writing") return;
    const target = mockDraft(post.idea, pid, variant++);
    const full = textOf(target);
    const tokens = full.split(/(\s+)/);
    const fail = state.flags.failBluesky && pid === "bluesky";
    Object.assign(st, { status: "writing", stream: "", error: "", confirming: false, notice: "", startedAt: Date.now() + 1 });
    refresh(post.id, pid);
    let i = 0;
    const speed = state.flags.slow ? 180 : 55;
    const tick = () => {
      if (fail && i > tokens.length * 0.35) {
        Object.assign(st, { status: "failed", stream: "", error: `Your ${P[pid].name} draft didn't finish. Your idea is saved.` });
        announce(`${P[pid].name} draft didn't finish.`);
        return refresh(post.id, pid);
      }
      const n = 3 + Math.floor(Math.random() * 4);
      st.stream += tokens.slice(i, i + n).join("");
      i += n;
      if (i >= tokens.length) {
        post.drafts[pid] = { content: structuredClone(target), generated: structuredClone(target), generatedAt: st.startedAt };
        post.updatedAt = Date.now();
        st.status = "idle"; st.stream = "";
        persist();
        announce(`${P[pid].name} draft ready.`);
        refresh(post.id, pid);
        return hooks.postChanged(post);
      }
      refresh(post.id, pid);
      st.timer = setTimeout(tick, speed);
    };
    st.timer = setTimeout(tick, 450 + idx * 380 + Math.random() * 300);
  }
  /** Leaving a page mid-stream discards the partial result (spec edge case). */
  function cancelAll() {
    for (const st of Object.values(ui)) {
      clearTimeout(st.timer);
      if (st.status === "writing") { st.status = "idle"; st.stream = ""; }
      st.confirming = false; st.notice = "";
    }
  }

  // ---------- Panel rendering ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmt = (n) => n.toLocaleString();
  const countHtml = (len, limit, i) => `<span class="count ${len > limit ? "over" : ""}" data-count="${i}">${fmt(len)} / ${fmt(limit)}</span>`;

  function panelBody(post, pid) {
    const p = P[pid], d = post.drafts[pid], st = u(post.id, pid);
    let h = "";
    if (st.notice) h += `<div class="notice" role="status">${esc(st.notice)}</div>`;
    if (st.status === "writing") {
      return h + `<div class="writing-label"><span class="dot dot-writing"></span>Writing your ${p.name} draft</div>
        <div class="draft-streaming" data-stream>${esc(st.stream)}</div>`;
    }
    if (st.status === "failed") {
      h += `<div class="panel-error" role="alert"><span>${esc(st.error)}</span><span class="spacer"></span>
        <button class="btn btn-secondary btn-sm" data-action="retry" data-pid="${pid}">Try again</button></div>`;
    }
    if (!d) {
      if (st.status !== "failed") h += `<p class="draft-empty">Not generated yet.</p>`;
      return h;
    }
    if (isStale(post, d)) {
      h += `<div class="stale-note"><span>Your idea changed since this draft.</span><span class="spacer"></span>
        <button class="btn btn-ghost btn-sm" data-action="regen" data-pid="${pid}">Regenerate</button></div>`;
    }
    if (pid === "x") {
      h += d.content.map((t, i) => `<div class="tweet">
          <textarea class="draft-text ${t.length > p.limit ? "over" : ""}" rows="1" data-pid="x" data-i="${i}" aria-label="Tweet ${i + 1}">${esc(t)}</textarea>
          <div class="tweet-meta">${countHtml(t.length, p.limit, i)}
            <button class="btn btn-ghost btn-sm" data-action="copy-tweet" data-pid="x" data-i="${i}" aria-label="Copy tweet ${i + 1}">Copy</button></div>
        </div>`).join("");
    } else {
      h += `<textarea class="draft-text ${d.content.length > p.limit ? "over" : ""}" rows="3" data-pid="${pid}" data-i="-1" aria-label="${p.name} draft">${esc(d.content)}</textarea>`;
    }
    const meta = pid === "x" ? `<span class="caption">${d.content.length} tweets</span>` : countHtml(d.content.length, p.limit, -1);
    h += `<div class="panel-actions">${meta}
        <span class="caption" data-edited>${isEdited(d) ? "· Edited" : ""}</span>
        <span class="save-state" data-save></span><span class="spacer"></span>
        <button class="btn btn-ghost btn-sm" data-action="regen" data-pid="${pid}">Regenerate</button>
        <button class="btn btn-secondary btn-sm" data-action="copy" data-pid="${pid}">${pid === "x" ? "Copy thread" : "Copy"}</button>
      </div>`;
    if (st.confirming) {
      h += `<div class="confirm-inline" role="alertdialog" aria-label="Replace your edits?">
        <span>Regenerating replaces your edits to this draft.</span><span class="spacer"></span>
        <button class="btn btn-ghost btn-sm" data-action="keep" data-pid="${pid}">Keep my edit</button>
        <button class="btn btn-secondary btn-sm" data-action="replace" data-pid="${pid}">Replace it</button></div>`;
    }
    return h;
  }

  /** Re-render one platform everywhere it appears: panel bodies, dots, state labels, generate buttons. */
  function refresh(postId, pid) {
    const post = getPost(postId);
    if (!post) return;
    document.querySelectorAll(`[data-panel-body="${pid}"][data-post="${postId}"]`).forEach((el) => {
      const st = u(postId, pid);
      const live = el.querySelector("[data-stream]");
      if (st.status === "writing" && live) live.textContent = st.stream;
      else { el.innerHTML = panelBody(post, pid); autosize(el); }
    });
    const ds = draftState(post, pid);
    document.querySelectorAll(`[data-dot="${pid}"][data-post="${postId}"]`).forEach((el) => (el.className = "dot dot-" + ds));
    document.querySelectorAll(`[data-state-label="${pid}"][data-post="${postId}"]`).forEach((el) => (el.textContent = STATE_LABEL[ds]));
    updateGenerate(post);
    hooks.refresh(post, pid);
  }
  function updateGenerate(post) {
    document.querySelectorAll(`[data-action="generate"]`).forEach((b) => {
      const ta = b.closest("[data-idea-block]")?.querySelector("[data-idea]");
      const ok = ta ? ideaCheck(ta.value).ok : !!post?.idea;
      b.disabled = !ok || anyWriting(post);
      b.textContent = hasDrafts(post) ? "Regenerate all" : "Generate drafts";
    });
  }

  function autosize(root) {
    root.querySelectorAll("textarea.draft-text").forEach((t) => { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; });
  }

  // ---------- Panel events (delegated, bind once per container) ----------
  function bindPanels(container, getCurrentPost) {
    const saveTimers = {};
    container.addEventListener("input", (e) => {
      const ta = e.target.closest("textarea.draft-text");
      if (!ta) return;
      const post = getCurrentPost(), pid = ta.dataset.pid, i = +ta.dataset.i, d = post?.drafts[pid];
      if (!d) return;
      if (i >= 0) d.content[i] = ta.value; else d.content = ta.value;
      const body = ta.closest("[data-panel-body]");
      const len = ta.value.length, over = len > P[pid].limit;
      ta.classList.toggle("over", over);
      const c = body.querySelector(`[data-count="${i}"]`);
      if (c) { c.textContent = `${fmt(len)} / ${fmt(P[pid].limit)}`; c.classList.toggle("over", over); }
      const ed = body.querySelector("[data-edited]"); if (ed) ed.textContent = isEdited(d) ? "· Edited" : "";
      autosize(body);
      const sv = body.querySelector("[data-save]"); if (sv) sv.textContent = "Saving…";
      clearTimeout(saveTimers[pid]);
      saveTimers[pid] = setTimeout(() => { post.updatedAt = Date.now(); persist(); if (sv) sv.textContent = "Saved"; hooks.postChanged(post); }, 800);
    });
    container.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn || !btn.dataset.pid) return;
      const post = getCurrentPost(), pid = btn.dataset.pid, st = u(post.id, pid), d = post.drafts[pid];
      switch (btn.dataset.action) {
        case "regen": return regenerate(post, pid, false);
        case "retry": return regenerate(post, pid, true);
        case "replace": st.confirming = false; return regenerate(post, pid, true);
        case "keep": st.confirming = false; return refresh(post.id, pid);
        case "copy":
        case "copy-tweet": {
          const i = btn.dataset.action === "copy-tweet" ? +btn.dataset.i : null;
          const text = i === null ? textOf(d.content) : d.content[i];
          const ok = await copyText(text);
          if (!ok) { st.notice = "Couldn't copy. Select the text and copy it manually."; return refresh(post.id, pid); }
          persist(); // copy also saves
          if (!post.copied) { post.copied = true; hooks.postChanged(post); }
          const label = btn.textContent;
          btn.textContent = "Copied"; btn.classList.add("is-done");
          announce("Copied");
          setTimeout(() => { btn.textContent = label; btn.classList.remove("is-done"); }, 1600);
        }
      }
    });
  }

  async function copyText(text) {
    if (state.flags.clipboardBlocked) return false;
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      try {
        const t = Object.assign(document.createElement("textarea"), { value: text });
        document.body.append(t); t.select(); const ok = document.execCommand("copy"); t.remove(); return ok;
      } catch { return false; }
    }
  }

  // ---------- Idea block (shared markup + behaviour) ----------
  function ideaBlock(post, { label = "Your idea", placeholder = "What's been on your mind this week? Type it rough. It doesn't need to be good.", rows = 5, autofocus = false } = {}) {
    const text = post ? post.idea : "";
    const chk = ideaCheck(text);
    return `<div data-idea-block>
      ${label ? `<label class="eyebrow" for="idea">${label}</label>` : ""}
      <textarea id="idea" class="idea-field" data-idea rows="${rows}" placeholder="${esc(placeholder)}" ${autofocus ? "autofocus" : ""}>${esc(text)}</textarea>
      <div class="idea-meta">
        <span class="count" data-idea-count>${fmt(text.length)} / 5,000</span>
        <span class="field-error" data-idea-error>${chk.msg}</span>
        <span class="save-state" data-idea-save></span>
        <span class="spacer"></span>
        <button class="btn btn-primary" data-action="generate" ${chk.ok && !anyWriting(post) ? "" : "disabled"}>${hasDrafts(post) ? "Regenerate all" : "Generate drafts"}</button>
      </div>
      <div data-idea-notice></div>
    </div>`;
  }
  /** ctx: { getPost(), onCreate(post), onGenerate(post) } */
  function bindIdea(root, ctx) {
    const block = root.querySelector("[data-idea-block]");
    if (!block) return;
    const ta = block.querySelector("[data-idea]"), btn = block.querySelector('[data-action="generate"]');
    const sv = block.querySelector("[data-idea-save]");
    let t;
    const ensurePost = () => {
      let post = ctx.getPost();
      if (!post && ta.value.trim()) { post = createPost(ta.value.trim()); ctx.onCreate?.(post); }
      return post;
    };
    ta.addEventListener("input", () => {
      const chk = ideaCheck(ta.value);
      block.querySelector("[data-idea-count]").textContent = `${fmt(ta.value.length)} / 5,000`;
      block.querySelector("[data-idea-error]").textContent = chk.msg;
      ta.classList.toggle("over", ta.value.length > 5000);
      btn.disabled = !chk.ok || anyWriting(ctx.getPost());
      clearTimeout(t);
      if (!ta.value.trim()) return;
      sv.textContent = "Saving…";
      t = setTimeout(() => { const post = ensurePost(); if (post) saveIdea(post, ta.value); sv.textContent = "Saved"; }, 900);
    });
    btn.addEventListener("click", () => {
      clearTimeout(t);
      const post = ensurePost();
      if (!post) return;
      saveIdea(post, ta.value);
      sv.textContent = "";
      const res = generateAll(post);
      block.querySelector("[data-idea-notice]").innerHTML = res.refused ? `<div class="notice" role="status">${esc(res.refused)}</div>` : "";
      if (!res.refused) ctx.onGenerate?.(post);
    });
  }

  // ---------- Misc UI ----------
  function relTime(ts) {
    const d = Date.now() - ts;
    if (d < MIN) return "Just now";
    if (d < HOUR) return `${Math.round(d / MIN)} min ago`;
    if (d < DAY) { const h = Math.round(d / HOUR); return `${h} hour${h > 1 ? "s" : ""} ago`; }
    if (d < 2 * DAY) return "Yesterday";
    return `${Math.round(d / DAY)} days ago`;
  }
  let live;
  function announce(msg) {
    if (!live) { live = Object.assign(document.createElement("div"), { className: "sr-only" }); live.setAttribute("aria-live", "polite"); document.body.append(live); }
    live.textContent = ""; setTimeout(() => (live.textContent = msg), 30);
  }
  function confirmDelete(onConfirm) {
    let dlg = document.getElementById("lc-delete");
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.id = "lc-delete";
      dlg.innerHTML = `<h2>Delete this post?</h2><p>Your idea and its drafts will be removed from your posts.</p>
        <div class="row"><button class="btn btn-secondary" value="cancel">Cancel</button><button class="btn btn-danger-fill" value="ok">Delete post</button></div>`;
      document.body.append(dlg);
      dlg.addEventListener("click", (e) => { const v = e.target.closest("button")?.value; if (v) dlg.close(v); });
    }
    dlg.onclose = () => { if (dlg.returnValue === "ok") onConfirm(); };
    dlg.returnValue = "";
    dlg.showModal();
  }

  function protoControls(current) {
    const f = state.flags;
    const el = document.createElement("details");
    el.className = "proto";
    el.innerHTML = `<summary>Prototype controls</summary><div class="body">
      <label><input type="checkbox" data-flag="failBluesky" ${f.failBluesky ? "checked" : ""}> Bluesky fails mid-draft</label>
      <label><input type="checkbox" data-flag="rateLimited" ${f.rateLimited ? "checked" : ""}> Daily limit reached</label>
      <label><input type="checkbox" data-flag="clipboardBlocked" ${f.clipboardBlocked ? "checked" : ""}> Clipboard blocked</label>
      <label><input type="checkbox" data-flag="slow" ${f.slow ? "checked" : ""}> Slow streaming</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button data-do="empty">Empty state</button><button data-do="reset">Reset data</button></div>
      <div class="links">${[["notebook", "1 Notebook"], ["desk", "2 Desk"], ["spread", "3 Spread"], ["hybrid", "4 Hybrid"]]
        .map(([k, n]) => (k === current ? `<strong>${n}</strong>` : `<a href="${k}.html">${n}</a>`)).join("")}<a href="index.html">All</a></div>
    </div>`;
    el.addEventListener("change", (e) => { const k = e.target.dataset.flag; if (k) { f[k] = e.target.checked; persist(); } });
    el.addEventListener("click", (e) => {
      const d = e.target.dataset.do;
      if (!d) return;
      cancelAll();
      state.posts = d === "empty" ? [] : seed();
      persist();
      hooks.reset();
    });
    document.body.append(el);
  }

  return {
    PLATFORMS, P, hooks, state: () => state,
    posts, getPost, createPost, deletePost, postStatus, statusPill, preview, relTime,
    draftState, STATE_LABEL, anyWriting, hasDrafts, isEdited, isStale,
    ideaBlock, bindIdea, ideaCheck, saveIdea,
    panelBody, bindPanels, refresh, autosize, cancelAll, regenerate,
    confirmDelete, protoControls, esc, announce,
  };
})();
