/* Vault graph view (ADR-KI-0058 Decision 11). Self-contained: no library and no
 * request beyond /graph.json, so it runs offline and its CSP can forbid the rest.
 * A converted book (ADR-KI-0059) shows as one node until it is opened; its chapters
 * then sit in reading order on a ring around it. */
(function () {
  "use strict";
  const BUCKETS = [
    ["inbox", "0.Inbox"], ["projects", "1.Projects"], ["areas", "2.Areas"],
    ["resources", "3.Resources"], ["archive", "4.Archive"], ["none", "Out of place"],
  ];
  const MASTERY = [
    ["unsparred", "Unsparred"], ["attempted", "Attempted"], ["tier1_passed", "Tier 1 passed"], ["tier2_passed", "Tier 2 passed"],
  ];
  const RING = { attempted: "var(--attempted)", tier1_passed: "var(--tier1)", tier2_passed: "var(--tier2)" };
  const NS = "http://www.w3.org/2000/svg";
  const $ = id => document.getElementById(id);
  const svg = $("graph");
  const state = {
    graph: null, nodes: [], byId: new Map(), chaptersOf: new Map(), links: [],
    view: { x: 0, y: 0, k: 1 }, hidden: new Set(["archive"]), hiddenMastery: new Set(), hideRaw: false,
    expanded: new Set(), query: "", selected: null,
  };

  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };
  const html = (tag, props, ...children) => {
    const e = document.createElement(tag);
    Object.assign(e, props || {});
    e.append(...children);
    return e;
  };
  const bucketOf = n => n.bucket || "none";
  const folded = n => n.book && !state.expanded.has(n.book);
  const visible = n => !folded(n) && !state.hidden.has(bucketOf(n)) && !state.hiddenMastery.has(n.mastery) && !(state.hideRaw && n.raw);
  const matches = n => !state.query || (n.title + " " + n.id).toLowerCase().includes(state.query);
  const labelOf = n => (n.rawRole === "index" && n.chapterCount ? `${n.label} · ${n.chapterCount}` : n.label);
  /** Where an edge end is drawn: a folded chapter's edges attach to its book. */
  const anchor = n => (folded(n) ? state.byId.get(n.book) : n);

  /* Force layout over everything but chapters: pairwise repulsion, link springs, and a
   * pull towards each bucket's anchor so PARA buckets form clusters. Chapters are placed
   * around their book at render time. */
  function layout(w, h) {
    const nodes = state.nodes.filter(n => !n.book);
    const anchors = {};
    BUCKETS.forEach(([b], i) => {
      const a = (i / BUCKETS.length) * Math.PI * 2 - Math.PI / 2;
      anchors[b] = { x: w / 2 + Math.cos(a) * w * 0.28, y: h / 2 + Math.sin(a) * h * 0.28 };
    });
    for (const n of nodes) {
      const a = anchors[bucketOf(n)];
      n.x = a.x + (Math.random() - 0.5) * 80; n.y = a.y + (Math.random() - 0.5) * 80; n.vx = 0; n.vy = 0;
    }
    const top = n => (n.book ? state.byId.get(n.book) : n);
    const springs = state.links.map(([a, b]) => [top(a), top(b)]).filter(([a, b]) => a && b && a !== b);
    for (let tick = 0, alpha = 1; tick < 300; tick++, alpha *= 0.985) {
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < 0.01) { dx = Math.random(); dy = Math.random(); d2 = 1; }
          if (d2 > 40000) continue;
          const f = (600 / d2) * alpha;
          a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
        }
      }
      for (const [a, b] of springs) {
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = ((d - 60) / d) * 0.05 * alpha;
        a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
      }
      for (const n of nodes) {
        const a = anchors[bucketOf(n)];
        n.vx += (a.x - n.x) * 0.012 * alpha; n.vy += (a.y - n.y) * 0.012 * alpha;
        n.x += n.vx; n.y += n.vy; n.vx *= 0.6; n.vy *= 0.6;
      }
    }
  }

  const ringOf = count => { const ry = 50 + count * 6; return { rx: ry * 1.25, ry }; };

  /**
   * Put an open book's chapters on a wide ellipse around it, in reading order clockwise
   * from just right of the top. Wider than tall, and with no chapter exactly at the top or
   * bottom, so labels there fan out to either side instead of stacking.
   */
  function placeChapters() {
    for (const [book, chapters] of state.chaptersOf) {
      const b = state.byId.get(book);
      if (!b) continue;
      const { rx, ry } = ringOf(chapters.length);
      chapters.forEach((c, i) => {
        const a = ((i + 0.5) / chapters.length) * Math.PI * 2 - Math.PI / 2;
        c.x = b.x + Math.cos(a) * rx; c.y = b.y + Math.sin(a) * ry; c.angle = a;
      });
    }
  }

  function render() {
    placeChapters();
    svg.textContent = "";
    const root = el("g", { transform: `translate(${state.view.x},${state.view.y}) scale(${state.view.k})` }, svg);
    const shown = new Set(state.nodes.filter(visible).map(n => n.id));
    const edgeLayer = el("g", { stroke: "var(--edge)", "stroke-width": 1.2 }, root);
    const drawn = new Set();
    for (const [x, y] of state.links) {
      const a = anchor(x), b = anchor(y);
      if (!a || !b || a === b || !shown.has(a.id) || !shown.has(b.id)) continue;
      const key = a.id < b.id ? a.id + "\0" + b.id : b.id + "\0" + a.id;
      if (drawn.has(key)) continue;
      drawn.add(key);
      const dim = state.query && !(matches(a) || matches(b));
      const spoke = a.book === b.id || b.book === a.id;
      el("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: dim ? "dim" : "", "stroke-dasharray": spoke ? "2 3" : "" }, edgeLayer);
    }
    const degree = new Map();
    for (const [x, y] of state.links) for (const n of [anchor(x), anchor(y)]) if (n) degree.set(n.id, (degree.get(n.id) || 0) + 1);
    const crowded = shown.size > 60;
    for (const n of state.nodes) {
      if (!shown.has(n.id)) continue;
      const r = n.rawRole === "index" ? 9 : n.book ? 5 : 5 + Math.min(6, degree.get(n.id) || 0);
      const g = el("g", { class: "node" + (matches(n) ? "" : " dim"), transform: `translate(${n.x},${n.y})`, tabindex: 0 }, root);
      const ring = { fill: "none", stroke: RING[n.mastery], "stroke-width": 3, "stroke-dasharray": n.mastery === "attempted" ? "3 2" : "" };
      const body = { fill: `var(--${bucketOf(n)})`, stroke: state.selected === n ? "var(--text)" : "var(--bg)", "stroke-width": state.selected === n ? 2.5 : 1.5 };
      if (n.raw) {
        const s = r + 2;
        if (RING[n.mastery]) el("rect", { x: -s - 4, y: -s - 4, width: 2 * s + 8, height: 2 * s + 8, rx: 3, ...ring }, g);
        el("rect", { x: -s, y: -s, width: 2 * s, height: 2 * s, rx: 2, ...body }, g);
      } else {
        if (RING[n.mastery]) el("circle", { r: r + 4, ...ring }, g);
        el("circle", { r, ...body }, g);
      }
      const labelled = state.selected === n || (state.query && matches(n)) || state.view.k > 1.3 || (!crowded && (!n.book || state.expanded.has(n.book)));
      if (labelled) {
        // On a book's ring a label points away from the book: sideways on the flanks,
        // above or below near the top and bottom, so neighbours do not overlap.
        const cos = n.book ? Math.cos(n.angle) : 1, sin = n.book ? Math.sin(n.angle) : 0;
        const steep = n.book && Math.abs(cos) < 0.35;
        const at = {
          x: cos < 0 ? -(r + 6) : r + 6,
          y: steep ? (sin < 0 ? -(r + 4) : r + 12) : 4,
          "text-anchor": cos < 0 ? "end" : "start",
        };
        // Keep labels the same size on screen when zoomed out.
        if (state.view.k < 1) at["font-size"] = (11 / state.view.k).toFixed(1);
        el("text", at, g).textContent = labelOf(n);
      }
      el("title", {}, g).textContent = `${n.title}\n${n.id}${n.rawRole === "index" ? "\nClick to open or close the book" : ""}`;
      g.addEventListener("click", ev => { ev.stopPropagation(); if (n.rawRole === "index") toggle(n.id); select(n); });
      g.addEventListener("keydown", ev => { if (ev.key === "Enter") { if (n.rawRole === "index") toggle(n.id); select(n); } });
    }
    $("status").textContent = `${shown.size} of ${state.nodes.length} notes shown · click a book to open it · scroll to zoom, drag to pan`;
  }

  function toggle(book) {
    if (state.expanded.has(book)) { state.expanded.delete(book); return; }
    state.expanded.add(book);
    centre(state.byId.get(book));
  }

  /** Pan so a node sits in the middle of the canvas; for a book, zoom so its ring and labels fit. */
  function centre(n) {
    if (!n) return;
    const box = svg.getBoundingClientRect();
    const w = box.width || 900, h = box.height || 700;
    const chapters = state.chaptersOf.get(n.id);
    if (chapters) {
      const { rx, ry } = ringOf(chapters.length);
      state.view.k = Math.min(1.2, (w / 2 - 190) / rx, (h / 2 - 40) / ry);
    }
    state.view.x = w / 2 - n.x * state.view.k;
    state.view.y = h / 2 - n.y * state.view.k;
  }

  function select(n) {
    state.selected = n;
    const d = $("detail");
    d.textContent = "";
    if (!n) { d.appendChild(html("p", { className: "empty", textContent: "Select a note to see its PARA location and sparring state. Click a book to open its chapters." })); render(); return; }
    const label = (list, key) => (list.find(([k]) => k === key) || [key, key])[1];
    const h = html("h2", { textContent: n.title });
    h.style.textTransform = "none"; h.style.fontSize = "15px"; h.style.color = "var(--text)";
    const dl = html("dl");
    const rows = [["Path", n.id], ["Bucket", label(BUCKETS, bucketOf(n)) + (n.raw ? " · raw resource" : "")]];
    if (n.rawRole === "index") rows.push(["Chapters", String(n.chapterCount)]);
    else rows.push(["Mastery", label(MASTERY, n.mastery)], ["Next review", n.nextReview || "—"]);
    rows.push(["Links", String(state.links.filter(([a, b]) => a === n || b === n).length)]);
    for (const [k, v] of rows) dl.append(html("dt", { textContent: k }), html("dd", { textContent: v }));
    const open = html("a", { href: `obsidian://open?vault=${encodeURIComponent(state.graph.vaultName)}&file=${encodeURIComponent(n.id.replace(/\.md$/, ""))}`, textContent: "Open in Obsidian" });
    d.append(h, dl, html("p", {}, open));
    if (n.rawRole === "index") {
      const chapters = state.chaptersOf.get(n.id) || [];
      const sparred = chapters.filter(c => c.mastery !== "unsparred").length;
      d.append(html("p", { textContent: `${sparred} of ${chapters.length} chapters sparred.` }));
      const btn = html("button", { type: "button", textContent: state.expanded.has(n.id) ? "Close book" : "Open book" });
      btn.addEventListener("click", () => { toggle(n.id); select(n); });
      d.append(html("p", {}, btn));
      const list = html("ol");
      list.style.paddingLeft = "18px";
      for (const c of chapters) {
        const a = html("a", { href: "#", textContent: c.label });
        a.addEventListener("click", ev => { ev.preventDefault(); state.expanded.add(n.id); select(c); });
        const li = html("li", {}, a, ` · ${label(MASTERY, c.mastery)}`);
        li.style.color = RING[c.mastery] || "var(--muted)";
        a.style.color = "var(--text)";
        list.append(li);
      }
      d.append(list);
    }
    render();
  }

  function filters() {
    const counts = (key, of) => state.nodes.filter(n => of(n) === key).length;
    const build = (host, list, set, of, mark) => {
      host.textContent = "";
      for (const [key, name] of list) {
        const cb = html("input", { type: "checkbox", checked: !set.has(key) });
        cb.addEventListener("change", () => { cb.checked ? set.delete(key) : set.add(key); render(); });
        host.appendChild(html("label", {}, cb, mark(key), document.createTextNode(name), html("span", { className: "count", textContent: counts(key, of) })));
      }
    };
    build($("buckets"), BUCKETS, state.hidden, bucketOf, key => { const s = html("span", { className: "swatch" }); s.style.background = `var(--${key})`; return s; });
    const rawBox = html("input", { type: "checkbox", checked: !state.hideRaw });
    rawBox.addEventListener("change", () => { state.hideRaw = !rawBox.checked; render(); });
    const sq = html("span", { className: "swatch" }); sq.style.borderRadius = "2px"; sq.style.background = "var(--resources)";
    $("buckets").appendChild(html("label", {}, rawBox, sq, document.createTextNode("Raw resources (square)"), html("span", { className: "count", textContent: state.nodes.filter(n => n.raw).length })));
    build($("mastery"), MASTERY, state.hiddenMastery, n => n.mastery, key => {
      const s = html("span", { className: "ring" });
      s.style.borderColor = RING[key] || "var(--line)"; if (key === "attempted") s.style.borderStyle = "dashed"; return s;
    });
  }

  async function load() {
    $("status").textContent = "Loading…";
    const res = await fetch("graph.json", { cache: "no-store" });
    if (!res.ok) { $("status").textContent = `Could not load the graph: ${res.status}`; return; }
    const graph = await res.json();
    state.graph = graph;
    state.nodes = graph.nodes.map(n => Object.assign({}, n));
    state.byId = new Map(state.nodes.map(n => [n.id, n]));
    state.chaptersOf = new Map();
    for (const n of state.nodes) if (n.book) state.chaptersOf.set(n.book, [...(state.chaptersOf.get(n.book) || []), n]);
    for (const list of state.chaptersOf.values()) list.sort((a, b) => (a.id < b.id ? -1 : 1));
    if (location.hash === "#open-books") state.expanded = new Set(state.chaptersOf.keys());
    state.links = graph.edges.map(e => [state.byId.get(e.source), state.byId.get(e.target)]).filter(([a, b]) => a && b);
    const box = svg.getBoundingClientRect();
    layout(box.width || 900, box.height || 700);
    state.view = { x: 0, y: 0, k: 1 };
    if (state.expanded.size === 1) centre(state.byId.get([...state.expanded][0]));
    const by = m => state.nodes.filter(n => n.mastery === m && n.rawRole !== "index").length;
    const books = state.nodes.filter(n => n.rawRole === "index").length;
    $("title").textContent = `${graph.vaultName} — vault graph`;
    $("stats").textContent = `${state.nodes.length} notes · ${graph.edges.length} links · ${books} book${books === 1 ? "" : "s"} · ${by("tier2_passed")} Tier 2 passed · ${by("tier1_passed")} Tier 1 passed · ${by("attempted")} attempted`;
    filters();
    select(null);
  }

  let drag = null;
  svg.addEventListener("pointerdown", ev => { drag = { x: ev.clientX, y: ev.clientY, vx: state.view.x, vy: state.view.y, moved: false }; svg.classList.add("dragging"); });
  window.addEventListener("pointermove", ev => {
    if (!drag) return;
    if (Math.abs(ev.clientX - drag.x) + Math.abs(ev.clientY - drag.y) > 3) drag.moved = true;
    state.view.x = drag.vx + ev.clientX - drag.x; state.view.y = drag.vy + ev.clientY - drag.y; render();
  });
  window.addEventListener("pointerup", () => { svg.classList.remove("dragging"); setTimeout(() => { drag = null; }, 0); });
  svg.addEventListener("wheel", ev => {
    ev.preventDefault();
    const box = svg.getBoundingClientRect(), mx = ev.clientX - box.left, my = ev.clientY - box.top;
    const k = Math.max(0.2, Math.min(5, state.view.k * (ev.deltaY < 0 ? 1.15 : 1 / 1.15)));
    state.view.x = mx - ((mx - state.view.x) * k) / state.view.k; state.view.y = my - ((my - state.view.y) * k) / state.view.k; state.view.k = k;
    render();
  }, { passive: false });
  svg.addEventListener("click", () => { if (!drag || !drag.moved) select(null); });
  $("search").addEventListener("input", ev => { state.query = ev.target.value.trim().toLowerCase(); render(); });
  $("refresh").addEventListener("click", load);
  load();
})();
