(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const THEME_KEY = "vault-view-theme";
  const remember = (key, value) => { try { localStorage.setItem(key, value); return true; } catch { return false; } };
  const recall = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
  const TOKEN = (document.querySelector('meta[name="vault-token"]') || {}).content || "";
  const STEPS = ["read", "group", "generate", "retrieve", "elaborate", "space", "teach"];
  const SVG = "http://www.w3.org/2000/svg";
  const state = { data: null, tab: "stairs", book: null, selected: null, mode: "memory", animating: false };

  const el = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) e.append(kid);
    return e;
  };
  const svg = (tag, attrs, ...kids) => {
    const e = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v !== null && v !== undefined) e.setAttribute(k, String(v));
    for (const kid of kids.flat()) if (kid) e.append(kid);
    return e;
  };
  const press = (buttons, on) => buttons.forEach(b => b.setAttribute("aria-pressed", String(b === on)));
  const obsidian = file => `obsidian://open?vault=${encodeURIComponent(state.data.vaultName)}&file=${encodeURIComponent(file)}`;

  async function post(path, body) {
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json", "x-vault-token": TOKEN }, body: JSON.stringify(body) });
    let data = null;
    try { data = await res.json(); } catch { data = { errors: [`${res.status} ${res.statusText}`] }; }
    return { ok: res.ok, data };
  }

  async function load() {
    const res = await fetch("/climb.json");
    state.data = await res.json();
    const books = state.data.books.map(b => b.book);
    if (!state.book || !books.includes(state.book)) state.book = books[0] || null;
    if (!state.selected || !state.data.concepts.some(c => c.path === state.selected)) state.selected = (concepts()[0] || state.data.concepts[0] || {}).path || null;
    renderBooks();
    render();
  }

  const concepts = () => {
    const b = bookData();
    if (b && b.kind === "topic") return state.data.concepts.filter(c => b.concepts.some(x => x.path === c.path));
    return state.data.concepts.filter(c => !state.book || (c.books || [c.book]).includes(state.book));
  };
  const groupIn = c => (state.book && c.groups && c.groups[state.book]) || null;
  const bookData = () => state.data.books.find(b => b.book === state.book) || null;

  function renderBooks() {
    const select = $("book");
    select.replaceChildren(...state.data.books.map(b => el("option", { value: b.book, text: b.kind === "topic" ? `Topic: ${b.book}` : b.book, selected: b.book === state.book })));
    select.classList.toggle("hidden", !state.data.books.length);
  }

  function render() {
    for (const t of ["stairs", "draw", "sketch"]) $(`tab-${t}`).classList.toggle("hidden", state.tab !== t);
    $("animate").classList.toggle("hidden", state.tab !== "stairs");
    if (state.tab === "stairs") renderStairsTab();
    if (state.tab === "draw") renderDrawTab();
    if (state.tab === "sketch") renderSketchTab();
  }

  function pip(c, step) {
    const done = c.steps[step];
    const cls = done ? (step === "teach" ? "pip teach" : "pip done") : c.skipped.includes(step) ? "pip skipped" : "pip";
    const tip = done ? `${step}: ${done.date} · ${done.evidence}` : c.skipped.includes(step) ? `${step}: skipped` : `${step}: open`;
    return el("td", { class: "cell", title: tip }, el("span", { class: cls }));
  }

  function renderStairsTab() {
    const list = concepts();
    $("no-concepts").classList.toggle("hidden", list.length > 0);
    const byGroup = new Map();
    for (const c of list) {
      const key = groupIn(c) || "No group";
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key).push(c);
    }
    const rows = [];
    for (const [group, cs] of byGroup) {
      if (byGroup.size > 1 || group !== "No group") rows.push(el("tr", { class: "group-row" }, el("td", { colspan: "9", text: group })));
      for (const c of cs) rows.push(el("tr", { class: `concept${c.path === state.selected ? " selected" : ""}`, onclick: () => { state.selected = c.path; renderStairsTab(); } },
        el("td", { text: c.title }), ...STEPS.map(s => pip(c, s)), el("td", { class: "next", text: c.next ? `next: ${c.next}` : "done" })));
    }
    $("rows").replaceChildren(...rows);
    renderStage();
  }

  function renderStage(animate) {
    const c = state.data.concepts.find(x => x.path === state.selected);
    const stage = $("stage");
    if (!c) { stage.replaceChildren(el("p", { class: "faint", text: "Pick a concept." })); return; }
    const W = 760, H = 420, stepW = W / 7, rise = (H - 70) / 7;
    const steps = STEPS.map((s, i) => {
      const done = c.steps[s];
      const x = i * stepW, h = rise * (i + 1), y = H - 30 - h;
      const cls = ["step", s === "teach" ? "teach" : "", done ? "done" : "", !done && c.skipped.includes(s) ? "skipped" : "", animate ? "hide" : ""].filter(Boolean).join(" ");
      const g = svg("g", { class: cls, "data-i": i },
        svg("title", {}, document.createTextNode(done ? `${s} · ${done.date}\n${done.evidence}` : c.skipped.includes(s) ? `${s} · skipped` : `${s} · open`)),
        svg("rect", { x: x + 3, y, width: stepW - 6, height: h, rx: 8 }),
        svg("text", { x: x + stepW / 2, y: y + 26, "text-anchor": "middle" }, document.createTextNode(s.toUpperCase())),
        done ? svg("text", { class: "date", x: x + stepW / 2, y: y + 44, "text-anchor": "middle" }, document.createTextNode(done.date)) : null);
      return g;
    });
    const labels = svg("g", { class: "labels" },
      svg("text", { x: 4, y: H - 8 }, document.createTextNode("fluency")),
      svg("text", { x: W - 4, y: H - 8, "text-anchor": "end" }, document.createTextNode("mastery")));
    const chart = svg("svg", { class: "stair", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `${c.title}: ${STEPS.filter(s => c.steps[s]).length} of 7 steps done` }, ...steps, labels);
    const facts = el("dl", { class: "facts" },
      el("dt", { text: "Next" }), el("dd", { text: c.next || "all seven steps done" }),
      c.skipped.length ? [el("dt", { text: "Skipped" }), el("dd", { text: c.skipped.join(", ") })] : null,
      el("dt", { text: "Teach" }), el("dd", { text: c.steps.teach ? `done ${c.steps.teach.date}` : c.teach.ok ? "unlocked" : c.teach.reason }),
      c.books && c.books.length > 1 ? [el("dt", { text: "Books" }), el("dd", { text: c.books.map(b => `${b}: ${(c.groups || {})[b] || "not grouped yet"}`).join(" · ") })] : null,
      el("dt", { text: "Summary" }), el("dd", { text: c.current ? "climb: matches the evidence" : "climb: differs from the evidence; run rebuild_climb" }),
      el("dt", { text: "Note" }), el("dd", {}, el("a", { href: obsidian(c.path), text: c.path })));
    const book = state.book && (c.books || []).includes(state.book) ? state.book : c.book;
    stage.replaceChildren(el("h3", { text: c.title }), el("p", { class: "muted", text: [book, (c.groups || {})[book] || null].filter(Boolean).join(" · ") }), chart, facts);
    if (animate) {
      const gs = [...chart.querySelectorAll("g.step")];
      gs.forEach((g, i) => setTimeout(() => g.classList.remove("hide"), 350 + i * 650));
    }
  }

  const board = { book: null, mode: null, ready: false };
  window.addEventListener("climb-board:ready", () => { board.ready = true; if (state.tab === "draw") renderDrawTab(); });

  async function renderDrawTab() {
    press([...$("modes").querySelectorAll("button")], $("modes").querySelector(`[data-mode="${state.mode}"]`));
    $("idk").classList.toggle("hidden", state.mode !== "memory");
    $("board-go").textContent = state.mode === "memory" ? "Reveal" : "Preview save";
    if (!board.ready || !window.climbBoard) return;
    if (board.book === state.book && board.mode === state.mode) return;
    board.book = state.book;
    board.mode = state.mode;
    $("board-result").replaceChildren();
    let prefill = null;
    if (state.mode === "structure" && bookData() && bookData().structure) {
      const res = await fetch(`/structure.json?book=${encodeURIComponent(state.book)}`);
      if (res.ok) prefill = await res.json();
    }
    const b = bookData();
    window.climbBoard.load({ concepts: b ? (state.mode === "structure" ? b.candidates || b.concepts : b.concepts) : [], prefill });
  }

  function resetBoard() { board.book = null; renderDrawTab(); }

  function drawing() {
    const d = window.climbBoard ? window.climbBoard.drawing() : { groups: [], builds_on: [] };
    const b = bookData();
    return { ...(b && b.kind === "topic" ? { topic: state.book } : { book: state.book }), ...d };
  }

  const list = (items, cls) => items.length ? el("ul", {}, ...items.map(t => el("li", { class: cls, text: t }))) : null;

  async function boardGo(idk) {
    const out = $("board-result");
    if (state.mode === "structure") {
      const r = await post("/api/structure", drawing());
      showStructurePreview(r.data);
      return out.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    if (!drawing().groups.length && !idk) { out.replaceChildren(el("div", { class: "result" }, el("p", { text: "Draw the groups first, or press I don't know." }))); return; }
    const r = await post("/api/reveal", { ...drawing(), idk: idk === true });
    if (!r.ok) { out.replaceChildren(el("div", { class: "result" }, el("p", { class: "err", text: r.data.error || "could not reveal" }))); out.scrollIntoView({ behavior: "smooth", block: "nearest" }); return; }
    showCompare(r.data);
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showStructurePreview(d) {
    const out = $("board-result");
    const confirm = el("button", { class: "btn primary", text: "Write it", onclick: async () => {
      const r = await post("/api/structure", { ...drawing(), execute: true, versions: d.versions });
      if (r.data.executed) { out.replaceChildren(el("div", { class: "result" }, el("p", { text: `Written: ${d.path}` }))); await load(); }
      else showStructurePreview(r.data);
    } });
    out.replaceChildren(el("div", { class: "result" },
      d.errors && d.errors.length ? [el("b", { text: "Refused" }), list(d.errors, "err")] : [
        el("b", { text: `Preview: ${d.path}` }),
        list(Object.keys(d.climbs || {}).length ? d.climbs.map(c => `${c.path}: climb.group ${c.climb.group}`) : [], ""),
        list(d.warnings || [], "muted"),
        confirm,
      ]));
  }

  function showCompare(d) {
    const out = $("board-result");
    const real = el("div", { class: "real" }, el("h2", { text: "The structure note" }),
      ...d.structure.groups.slice().reverse().map(g => el("div", { class: "layer" }, el("b", { text: g.name }), el("span", { class: "muted", text: g.concepts.map(c => c.title).join(", ") }))),
      d.structure.buildsOn.length ? el("p", { class: "muted", text: d.structure.buildsOn.map(e => `${e.from} → ${e.to}`).join(" · ") }) : null);
    const rows = d.marks.map(m => {
      const select = el("select", {}, ...["got it", "wrong", "missed"].map(v => el("option", { value: v, text: v, selected: v === m.mark })));
      const fix = el("input", { type: "text", placeholder: "Your correction, in your own words", class: m.mark === "wrong" ? "" : "hidden" });
      select.addEventListener("change", () => fix.classList.toggle("hidden", select.value !== "wrong"));
      return { m, select, fix, li: el("li", {}, el("b", { text: m.assertion }), select, el("span", { class: "why", text: `suggested: ${m.why}` }), fix) };
    });
    const status = el("div");
    const marks = () => rows.map(r => ({ assertion: r.m.assertion, mark: r.select.value, ...(r.fix.value.trim() ? { correction: r.fix.value.trim() } : {}) }));
    const record = el("button", { class: "btn primary", text: "Preview record", onclick: async () => {
      const r = await post("/api/generate", { id: d.id, marks: marks() });
      if (r.data.errors && r.data.errors.length) { status.replaceChildren(list(r.data.errors, "err")); return; }
      status.replaceChildren(el("p", { text: `Will write ${r.data.sessionFile} and set climb.generate on ${(r.data.climbs || []).length} concept notes.` }), list(r.data.warnings || [], "muted"),
        el("button", { class: "btn primary", text: "Record it", onclick: async () => {
          const w = await post("/api/generate", { id: d.id, marks: marks(), execute: true });
          if (w.data.executed) { status.replaceChildren(el("p", { text: `Recorded as a Generate attempt: ${w.data.session_id}` })); await load(); }
          else status.replaceChildren(list(w.data.errors || ["not recorded"], "err"));
        } }));
    } });
    out.replaceChildren(el("div", { class: "result" },
      el("p", { class: "muted", text: `Your drawing was saved at ${d.attempted_at}, before the reveal at ${d.revealed_at}.` }),
      el("div", { class: "compare" }, real, el("div", {}, el("h2", { text: "Check each one" }), el("ul", { class: "marks" }, ...rows.map(r => r.li)), record, status))));
  }

  const pad = { strokes: [], current: null, erase: false, ready: false };

  function renderSketchTab() {
    const targets = [...state.data.books.map(b => ({ v: b.book, t: `Book: ${b.book}` })), ...state.data.concepts.map(c => ({ v: c.path, t: c.title }))];
    const sel = $("sketch-target");
    const was = sel.value || state.selected;
    sel.replaceChildren(...targets.map(o => el("option", { value: o.v, text: o.t, selected: o.v === was })));
    setupPad();
    $("thumbs").replaceChildren(...state.data.sketches.slice().reverse().map(s => el("figure", {},
      el("img", { src: `/sketch.png?path=${encodeURIComponent(s.path)}`, alt: s.name }), el("figcaption", { text: s.name }))));
    if (!state.data.sketches.length) $("thumbs").append(el("p", { class: "faint", text: "None yet." }));
  }

  function setupPad() {
    const c = $("pad");
    const ratio = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * ratio)) { c.width = Math.round(w * ratio); c.height = Math.round(h * ratio); }
    if (!pad.ready) {
      pad.ready = true;
      c.addEventListener("pointerdown", ev => { c.setPointerCapture(ev.pointerId); pad.current = { erase: pad.erase, points: [pt(ev)] }; pad.strokes.push(pad.current); paint(); });
      c.addEventListener("pointermove", ev => { if (pad.current) { pad.current.points.push(pt(ev)); paint(); } });
      const end = () => { pad.current = null; };
      c.addEventListener("pointerup", end);
      c.addEventListener("pointercancel", end);
    }
    paint();
  }

  function pt(ev) { const r = $("pad").getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top, ev.pressure || 0.5]; }

  function paint(forExport) {
    const c = $("pad");
    const ratio = c.width / Math.max(1, c.clientWidth);
    const ctx = c.getContext("2d");
    const css = getComputedStyle(document.documentElement);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = forExport ? "#ffffff" : css.getPropertyValue("--canvas").trim() || "#0b101b";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const s of pad.strokes) {
      ctx.strokeStyle = s.erase ? ctx.fillStyle : forExport ? "#0f172a" : css.getPropertyValue("--ink").trim();
      ctx.lineWidth = s.erase ? 22 : 3;
      ctx.beginPath();
      s.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (s.points.length === 1) ctx.lineTo(s.points[0][0] + 0.1, s.points[0][1]);
      ctx.stroke();
    }
  }

  async function saveSketch() {
    const out = $("sketch-result");
    if (!pad.strokes.length) { out.replaceChildren(el("div", { class: "result" }, el("p", { text: "Draw something first." }))); return; }
    paint(true);
    const png = $("pad").toDataURL("image/png");
    paint();
    const target = $("sketch-target").value;
    const r = await post("/api/sketch", { target, png });
    if (r.data.errors && r.data.errors.length) { out.replaceChildren(el("div", { class: "result" }, list(r.data.errors, "err"))); return; }
    out.replaceChildren(el("div", { class: "result" }, el("p", { text: `Will write ${r.data.path} (${Math.round(r.data.bytes / 1024)} KB).` }),
      el("button", { class: "btn primary", text: "Save it", onclick: async () => {
        const w = await post("/api/sketch", { target, png, execute: true });
        if (w.data.executed) { pad.strokes = []; out.replaceChildren(el("div", { class: "result" }, el("p", { text: `Saved ${w.data.path}` }))); await load(); }
        else out.replaceChildren(el("div", { class: "result" }, list(w.data.errors || ["not saved"], "err")));
      } })));
    out.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  $("tabs").addEventListener("click", ev => {
    const b = ev.target.closest("button[data-tab]");
    if (!b) return;
    state.tab = b.dataset.tab;
    press([...$("tabs").querySelectorAll("button")], b);
    render();
  });
  $("book").addEventListener("change", ev => { state.book = ev.target.value; state.selected = (concepts()[0] || {}).path || state.selected; render(); });
  $("modes").addEventListener("click", ev => {
    const b = ev.target.closest("button[data-mode]");
    if (!b) return;
    state.mode = b.dataset.mode;
    renderDrawTab();
  });
  $("new-topic").addEventListener("submit", ev => {
    ev.preventDefault();
    const name = $("topic-name").value.trim();
    if (!name) return;
    if (!state.data.books.some(b => b.book === name)) state.data.books.unshift({ book: name, kind: "topic", concepts: [], candidates: state.data.concepts.map(c => ({ path: c.path, title: c.title })), structure: null });
    state.book = name;
    state.mode = "structure";
    $("topic-name").value = "";
    renderBooks();
    render();
  });
  $("add-group").addEventListener("click", () => { if (window.climbBoard) window.climbBoard.addGroup(); });
  $("clear-board").addEventListener("click", resetBoard);
  $("board-go").addEventListener("click", () => boardGo(false));
  $("idk").addEventListener("click", () => boardGo(true));
  $("pen").addEventListener("click", () => { pad.erase = false; press([$("pen"), $("eraser")], $("pen")); });
  $("eraser").addEventListener("click", () => { pad.erase = true; press([$("pen"), $("eraser")], $("eraser")); });
  $("undo").addEventListener("click", () => { pad.strokes.pop(); paint(); });
  $("clear-pad").addEventListener("click", () => { pad.strokes = []; paint(); });
  $("save-sketch").addEventListener("click", saveSketch);
  $("animate").addEventListener("click", () => renderStage(true));
  const present = () => { const on = !document.body.classList.contains("present"); document.body.classList.toggle("present", on); $("present").setAttribute("aria-pressed", String(on)); if (state.tab !== "stairs") { state.tab = "stairs"; press([...$("tabs").querySelectorAll("button")], $("tabs").querySelector('[data-tab="stairs"]')); render(); } };
  $("present").addEventListener("click", present);
  $("theme").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    remember(THEME_KEY, next);
    if (state.tab === "sketch") paint();
  });
  window.addEventListener("resize", () => { if (state.tab === "sketch") setupPad(); });
  document.addEventListener("keydown", ev => {
    const path = ev.composedPath ? ev.composedPath() : [ev.target];
    if (path.some(n => n instanceof Element && n.matches("input,textarea,select,[contenteditable],climb-board"))) return;
    if (ev.key === "p" || ev.key === "P") present();
    if ((ev.key === "a" || ev.key === "A") && state.tab === "stairs") renderStage(true);
    if (state.tab === "stairs" && (ev.key === "ArrowDown" || ev.key === "ArrowUp")) {
      const cs = concepts();
      const i = cs.findIndex(c => c.path === state.selected);
      const next = cs[Math.max(0, Math.min(cs.length - 1, i + (ev.key === "ArrowDown" ? 1 : -1)))];
      if (next) { state.selected = next.path; renderStairsTab(); ev.preventDefault(); }
    }
  });

  { const t = recall(THEME_KEY); if (t === "light" || t === "dark") document.documentElement.dataset.theme = t; }
  const want = new URLSearchParams(location.hash.slice(1)).get("note");
  if (want) state.selected = want;
  load();
})();
