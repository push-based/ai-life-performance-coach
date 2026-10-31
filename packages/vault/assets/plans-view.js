/* Plans page (ADR-KI-0063). Read-only and self-contained: no library and no request
 * beyond /plans.json, so it runs offline under the same Content-Security-Policy as the
 * vault graph. The goal cascade sits beside an effort timeline; every text is set as a
 * text node, never as HTML. */
(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const THEME_KEY = "vault-view-theme";
  const ZOOM = [["year", "month", "Year"], ["quarter", "week", "Quarter"], ["month", "week", "Month"], ["week", "day", "Week"]];
  const STATUS = { met: "met", open: "open", missed: "missed", dropped: "dropped" };
  const state = { span: null, by: null, archived: false, data: null, selected: null };

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
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const obsidian = file => `obsidian://open?vault=${encodeURIComponent(state.data.vaultName)}&file=${encodeURIComponent(file)}`;
  const graphLink = file => `/#open=${encodeURIComponent(file)}`;
  const links = path => el("span", { class: "links" },
    el("a", { href: obsidian(path), text: "Open in Obsidian" }),
    el("a", { href: graphLink(path), text: "Show in graph" }));
  /** Wikilinks shown as their text. */
  const plain = t => t.replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2");
  /** A goal's words without its link, which the page shows as a tag of its own. */
  const words = t => t.replace(/\[\[[^\]]*\]\]:?/g, "").replace(/\s+/g, " ").trim() || plain(t);
  /** The row a goal counts for, as a short name. */
  const ownerName = g => g.owner.workstream || g.owner.project || g.owner.area || null;

  /* ── Periods, as the server names them ─────────────────────────────────── */

  const iso = d => d.toISOString().slice(0, 10);
  const isoWeek = day => {
    const d = new Date(`${day}T00:00:00Z`);
    const th = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7)));
    const y = th.getUTCFullYear();
    const jan4 = new Date(Date.UTC(y, 0, 4));
    const w1 = Date.UTC(y, 0, 4 - ((jan4.getUTCDay() + 6) % 7));
    return `${y}-W${String(1 + Math.round((th - w1 - 3 * 864e5) / (7 * 864e5))).padStart(2, "0")}`;
  };
  const periodAt = (level, day) => ({
    year: day.slice(0, 4), quarter: `${day.slice(0, 4)}-Q${Math.floor((Number(day.slice(5, 7)) - 1) / 3) + 1}`,
    month: day.slice(0, 7), week: isoWeek(day), day,
  })[level];
  const today = () => iso(new Date(Date.now() - new Date().getTimezoneOffset() * 6e4));

  /* ── Loading and the URL ───────────────────────────────────────────────── */

  function readHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    state.span = h.get("span");
    state.by = h.get("by");
    state.archived = h.get("archived") === "1";
  }
  function writeHash() {
    const h = new URLSearchParams();
    if (state.span) h.set("span", state.span);
    if (state.by) h.set("by", state.by);
    if (state.archived) h.set("archived", "1");
    history.replaceState(null, "", `#${h}`);
  }

  async function load() {
    const q = new URLSearchParams();
    if (state.span) q.set("span", state.span);
    if (state.by) q.set("by", state.by);
    const res = await fetch(`/plans.json?${q}`);
    const body = await res.json();
    if (!res.ok) {
      $("timeline").replaceChildren(el("div", { class: "error", text: body.error || `Could not load (${res.status})` }));
      return;
    }
    state.data = body;
    state.span = body.span.period;
    state.by = body.by;
    writeHash();
    render();
  }
  const go = (span, by) => { state.span = span; state.by = by; state.selected = null; load(); };

  /* ── Header ─────────────────────────────────────────────────────────────── */

  function header() {
    const d = state.data;
    $("span").textContent = d.span.period;
    $("timeline-title").textContent = `Effort by ${d.by} · ${d.span.start} to ${d.span.end}`;
    $("zoom").replaceChildren(...ZOOM.map(([level, by, name]) => el("button", {
      class: "btn", "aria-pressed": String(d.span.level === level), text: name, title: `${name} by ${by}`,
      onclick: () => go(periodAt(level, d.span.start <= d.today && d.today <= d.span.end ? d.today : d.span.start), by),
    })));
    $("archived").setAttribute("aria-pressed", String(state.archived));
  }

  /* ── Goal cascade ──────────────────────────────────────────────────────── */

  function goalItem(g) {
    const slips = g.slipped.length;
    const row = el("div", { class: `goal${state.selected?.goal === g ? " selected" : ""}`, title: `${g.level} ${g.period}`, onclick: () => select({ goal: g }) },
      el("span", { class: `dot ${STATUS[g.status]}` }),
      el("span", { class: "text" }, words(g.text), ownerName(g) ? el("span", { class: "owner", text: ownerName(g) }) : null),
      el("span", { class: "tag", text: g.period }),
      slips ? el("span", { class: "tag slip", text: `↻${slips}` }) : null);
    return el("li", null, row, g.children.length ? el("ul", { class: "tree" }, g.children.map(goalItem)) : null);
  }
  function goals() {
    const list = state.data.goals;
    $("goals").replaceChildren(list.length
      ? el("ul", { class: "tree" }, list.map(goalItem))
      : el("div", { class: "empty", text: "No goals in plans overlapping this span. Write them in Plans/ or with plan_period." }));
  }

  /* ── Effort timeline ───────────────────────────────────────────────────── */

  /** Goals pinned in a row's cell: those for the row whose period fits inside the column; larger goals live in the cascade. */
  function pinsFor(rowId, col) {
    const out = [];
    const walk = gs => { for (const g of gs) { if (g.row === rowId && within(g, col)) out.push(g); walk(g.children); } };
    walk(state.data.goals);
    return out;
  }
  function within(g, col) {
    const p = periodBounds(g.period);
    return p.start >= col.start && p.end <= col.end;
  }
  /** Start and end of a period name, computed the way the server does. */
  function periodBounds(name) {
    if (/^\d{4}$/.test(name)) return { start: `${name}-01-01`, end: `${name}-12-31` };
    if (/^\d{4}-Q\d$/.test(name)) {
      const y = Number(name.slice(0, 4)), q = Number(name.slice(6));
      return { start: iso(new Date(Date.UTC(y, (q - 1) * 3, 1))), end: iso(new Date(Date.UTC(y, q * 3, 0))) };
    }
    if (/^\d{4}-\d{2}$/.test(name)) {
      const y = Number(name.slice(0, 4)), m = Number(name.slice(5, 7));
      return { start: `${name}-01`, end: iso(new Date(Date.UTC(y, m, 0))) };
    }
    if (/^\d{4}-W\d{2}$/.test(name)) {
      const y = Number(name.slice(0, 4)), w = Number(name.slice(6));
      const jan4 = new Date(Date.UTC(y, 0, 4));
      const start = new Date(Date.UTC(y, 0, 4 - ((jan4.getUTCDay() + 6) % 7) + (w - 1) * 7));
      return { start: iso(start), end: iso(new Date(start.getTime() + 6 * 864e5)) };
    }
    return { start: name, end: name };
  }

  function timeline() {
    const d = state.data;
    const rows = d.rows.filter(r => state.archived || !r.archived)
      .filter(r => r.kind !== "unlinked" || r.cells.some(c => c.done || c.planned));
    const max = Math.max(1, ...rows.filter(r => r.kind !== "project").flatMap(r => r.cells.map(c => c.done)));
    const lit = new Set();
    const sel = state.selected;
    if (sel?.goal) {
      if (sel.goal.row) lit.add(sel.goal.row);
      const walk = gs => { for (const g of gs) { if (g.row) lit.add(g.row); walk(g.children); } };
      walk(sel.goal.children);
    }
    const head = el("tr", null, el("th", { class: "name" }),
      d.columns.map(c => el("th", {
        class: c.current ? "current" : null, text: label(c), title: `${c.start} to ${c.end}${c.level !== "day" ? " · click to zoom in" : ""}`,
        onclick: () => zoomInto(c),
      })));
    let previousKind = null;
    const body = rows.map(r => {
      const sep = previousKind && r.kind !== "workstream" && (r.kind !== previousKind || r.kind === "project");
      previousKind = r.kind;
      const cls = [r.kind, r.archived ? "archived" : "", sep ? "sep" : "", lit.has(r.id) ? "lit" : "", sel?.row === r ? "selected" : ""].join(" ");
      return el("tr", { class: cls },
        el("th", { class: "name", text: r.name, title: r.status ? `${r.name} · ${r.status}` : r.name, onclick: () => select({ row: r }) }),
        r.cells.map((c, i) => {
          const col = d.columns[i];
          const alpha = c.done ? 0.18 + 0.72 * Math.min(1, c.done / max) : 0;
          const pins = pinsFor(r.id, col);
          const slipped = r.tasks.some(t => t.column === i && t.state === "open" && t.slipped.length);
          const cell = el("div", {
            class: `cell${c.planned ? " planned" : ""}`,
            title: `${r.name} · ${label(col)}: ${c.done} done${c.planned ? `, ${c.planned} planned` : ""}${pins.length ? ` · ${plural(pins.length, "goal")}` : ""}`,
            onclick: () => select({ row: r, column: i }),
          }, c.done ? String(c.done) : c.planned ? `+${c.planned}` : "",
            pins.length ? el("span", { class: `pin ${worst(pins)}` }) : null,
            slipped ? el("span", { class: "slip", text: "↻" }) : null);
          if (alpha) cell.style.background = `rgba(var(--done-rgb), ${alpha.toFixed(2)})`;
          return el("td", { class: col.current ? "current" : null }, cell);
        }));
    });
    $("timeline").replaceChildren(el("table", null, el("thead", null, head), el("tbody", null, body)));
  }
  const worst = gs => (gs.some(g => g.status === "missed") ? "missed" : gs.some(g => g.status === "open") ? "open" : gs.some(g => g.status === "met") ? "met" : "dropped");
  const label = c => (c.level === "week" ? c.period.slice(5) : c.level === "day" ? c.period.slice(5) : c.level === "month" ? new Date(`${c.start}T00:00:00Z`).toLocaleString(undefined, { month: "short", timeZone: "UTC" }) : c.period);
  function zoomInto(c) {
    const by = { year: "month", quarter: "week", month: "week", week: "day" }[c.level];
    if (by) go(c.period, by);
  }

  /* ── Side panel ────────────────────────────────────────────────────────── */

  function taskItem(t) {
    return el("li", null,
      el("div", { class: t.state === "done" ? "state-done" : null, text: plain(t.text) }),
      el("div", { class: "meta" },
        t.size ? el("span", { class: "tag", text: t.size }) : null,
        t.doneOn ? el("span", { class: "tag", text: `✅ ${t.doneOn}` }) : t.scheduled ? el("span", { class: "tag", text: `⏳ ${t.scheduled}` }) : null,
        t.slipped.length ? el("span", { class: "tag slip", text: `↻ ${t.slipped.join(", ")}` }) : null),
      links(t.note));
  }

  /** replaceChildren, skipping the null a conditional leaves (which would print as "null"). */
  const fill = (parent, ...kids) => parent.replaceChildren(...kids.flat().filter(k => k !== null && k !== undefined && k !== false));

  function panel() {
    const p = $("panel");
    const sel = state.selected;
    $("main").classList.toggle("with-panel", !!sel);
    p.hidden = !sel;
    if (!sel) return;
    const close = el("button", { class: "btn close", text: "×", title: "Close (Esc)", onclick: () => select(null) });
    if (sel.goal) {
      const g = sel.goal;
      const kids = [];
      const walk = gs => { for (const c of gs) { kids.push(c); walk(c.children); } };
      walk(g.children);
      const counts = Object.keys(STATUS).map(s => [s, kids.filter(k => k.status === s).length]).filter(([, n]) => n);
      fill(p, close,
        el("h3", { text: words(g.text) }),
        ownerName(g) ? el("div", { class: "owner", text: `for ${ownerName(g)}` }) : null,
        el("div", { class: "muted", text: `${g.level} goal · ${g.period} · ${g.status}` }),
        g.slipped.length ? el("div", { class: "tag slip", text: `slipped from ${g.slipped.join(", ")}` }) : null,
        links(g.note),
        el("h2", { text: "Goals serving it" }),
        kids.length ? el("div", { class: "muted", text: counts.map(([s, n]) => `${n} ${s}`).join(" · ") }) : el("div", { class: "faint", text: "None yet." }),
        el("ul", null, kids.map(k => el("li", null,
          el("div", null, el("span", { class: `dot ${k.status}`, style: "display:inline-block;margin-right:6px" }), words(k.text), ownerName(k) ? el("span", { class: "owner", text: ownerName(k) }) : null),
          el("div", { class: "meta" }, el("span", { class: "tag", text: k.period }), k.slipped.length ? el("span", { class: "tag slip", text: `↻${k.slipped.length}` }) : null)))));
      return;
    }
    const r = sel.row;
    const col = sel.column === undefined ? null : state.data.columns[sel.column];
    const tasks = r.tasks.filter(t => col === null || t.column === sel.column);
    const done = tasks.filter(t => t.state === "done");
    const open = tasks.filter(t => t.state === "open");
    const weight = ts => ts.reduce((s, t) => s + t.weight, 0);
    fill(p, close,
      el("h3", { text: r.kind === "workstream" ? `${r.project} → ${r.name}` : r.name }),
      el("div", { class: "muted", text: [r.kind, r.archived ? "archived" : null, r.status, col ? `${col.period} (${col.start} to ${col.end})` : state.data.span.period].filter(Boolean).join(" · ") }),
      r.deadline || r.doneWhen ? el("div", { class: "muted", text: [r.deadline ? `deadline ${r.deadline}` : null, r.doneWhen ? `done when: ${r.doneWhen}` : null].filter(Boolean).join(" · ") }) : null,
      r.note ? links(r.note) : null,
      el("h2", { text: `Done · ${weight(done)} weight` }),
      done.length ? el("ul", null, done.map(taskItem)) : el("div", { class: "faint", text: "Nothing done here." }),
      el("h2", { text: `Planned · ${weight(open)} weight` }),
      open.length ? el("ul", null, open.map(taskItem)) : el("div", { class: "faint", text: "Nothing scheduled here." }),
      r.packets.length ? el("h2", { text: "Intermediate Packets" }) : null,
      r.packets.length ? el("ul", null, r.packets.map(k => el("li", null, el("div", { text: k.title }), links(k.path)))) : null);
  }

  /* ── Selection and rendering ───────────────────────────────────────────── */

  /** Select a goal ({ goal }), a row ({ row }) or a cell ({ row, column }); null clears it. */
  function select(s) {
    state.selected = s;
    render();
  }
  function render() {
    header();
    goals();
    timeline();
    panel();
  }

  /* ── Controls ──────────────────────────────────────────────────────────── */

  $("prev").addEventListener("click", () => state.data && go(state.data.previous, state.by));
  $("next").addEventListener("click", () => state.data && go(state.data.next, state.by));
  $("today").addEventListener("click", () => state.data && go(periodAt(state.data.span.level, today()), state.by));
  $("archived").addEventListener("click", () => { state.archived = !state.archived; writeHash(); render(); });
  $("theme").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch { /* storage may be unavailable */ }
  });
  document.addEventListener("keydown", e => {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowLeft") $("prev").click();
    else if (e.key === "ArrowRight") $("next").click();
    else if (e.key === "t" || e.key === "T") $("today").click();
    else if (e.key === "a" || e.key === "A") $("archived").click();
    else if (e.key === "Escape") select(null);
  });
  window.addEventListener("hashchange", () => {
    const before = `${state.span}|${state.by}|${state.archived}`;
    readHash();
    if (`${state.span}|${state.by}|${state.archived}` !== before) load();
  });

  try { const t = localStorage.getItem(THEME_KEY); if (t === "light" || t === "dark") document.documentElement.dataset.theme = t; } catch { /* default theme */ }
  readHash();
  load().catch(err => $("timeline").replaceChildren(el("div", { class: "error", text: String(err) })));
})();
