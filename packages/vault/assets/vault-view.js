/* Vault graph view (ADR-KI-0058 Decision 11). Self-contained: no library and no
 * request beyond /graph.json and /page.json, so it runs offline and its CSP can forbid
 * the rest. A converted book (ADR-KI-0059) shows as one node, ringed by its distilling
 * progress, until it is opened; its chapters then sit in reading order on a ring around
 * it. Concept notes (ADR-KI-0060), the notes that are sparred, are diamonds. Raw text is
 * coloured by how far it is distilled (ADR-KI-0061): an open chapter shows its pages,
 * each coloured by its deepest mark and ringed when it has a summary, and a selected
 * page is shown in full in the side panel. */
(function () {
  "use strict";

  /* ── Vocabulary ─────────────────────────────────────────────────────────── */

  const BUCKETS = [
    ["inbox", "Inbox"], ["projects", "Projects"], ["areas", "Areas"],
    ["resources", "Resources"], ["archive", "Archive"], ["none", "Out of place"],
  ];
  const KINDS = [["note", "Notes", ""], ["concept", "Concept notes", "dia"], ["raw", "Raw resources", "sq"]];
  const MASTERY = [
    ["unsparred", "Unsparred"], ["attempted", "Attempted"], ["tier1_passed", "Tier 1 passed"], ["tier2_passed", "Tier 2 passed"],
  ];
  const RING = { attempted: "var(--attempted)", tier1_passed: "var(--tier1)", tier2_passed: "var(--tier2)" };
  const STAGES = [
    ["unread", "Not read yet"], ["read", "Read"], ["notes", "Notes"], ["distilling", "Distilling"], ["distilled", "Distilled"], ["concepts", "Concepts"],
  ];
  const STAGE_FILL = { unread: "var(--untouched)", read: "var(--resources)", notes: "var(--resources)", distilling: "var(--bold)", distilled: "var(--complete)", concepts: "var(--complete)" };
  const MARK_FILL = { none: "var(--untouched)", bold: "var(--bold)", highlight: "var(--highlight)" };
  const MARKS = [["none", "Not marked"], ["bold", "Bolded"], ["highlight", "Highlighted"]];
  const CHAPTER_STATE = { untouched: "Not started", in_progress: "In progress", complete: "Complete" };

  const NS = "http://www.w3.org/2000/svg";
  const THEME_KEY = "vault-view-theme";
  const $ = id => document.getElementById(id);
  const svg = $("graph");
  const body = document.body;

  const state = {
    graph: null, nodes: [], byId: new Map(), chaptersOf: new Map(), links: [], adj: new Map(),
    view: { x: 0, y: 0, k: 1 }, hidden: new Set(["archive"]), hiddenMastery: new Set(), hiddenKinds: new Set(),
    expanded: new Set(), openChapters: new Set(), query: "", selected: null, root: null, intro: false, instant: false,
  };

  const label = (list, key) => (list.find(([k]) => k === key) || [key, key])[1];
  const bucketOf = n => n.bucket || "none";
  const kindOf = n => (n.concept ? "concept" : n.raw ? "raw" : "note");
  const folded = n => n.book && !state.expanded.has(n.book);
  const visible = n => !folded(n) && !state.hidden.has(bucketOf(n)) && !state.hiddenKinds.has(kindOf(n)) && (n.raw || !state.hiddenMastery.has(n.mastery));
  const matches = n => !state.query || (n.title + " " + n.id).toLowerCase().includes(state.query);
  const anchor = n => (folded(n) ? state.byId.get(n.book) : n);
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  /** A chapter's colour: green when complete, else its deepest mark so far. */
  const chapterFill = c => {
    const d = c.distill;
    if (!d) return null;
    if (d.state === "complete") return "var(--complete)";
    return MARK_FILL[d.pages.some(p => p.mark === "highlight") ? "highlight" : d.pages.some(p => p.mark === "bold") ? "bold" : "none"];
  };
  const fillOf = n => (n.rawRole === "index" && n.stage ? STAGE_FILL[n.stage] : chapterFill(n) || `var(--${bucketOf(n)})`);
  const bookCounts = book => {
    const chapters = state.chaptersOf.get(book.id) || [];
    const complete = chapters.filter(c => c.distill && c.distill.state === "complete").length;
    const progress = chapters.filter(c => c.distill && c.distill.state === "in_progress").length;
    return { chapters, total: chapters.length, complete, progress, untouched: chapters.length - complete - progress };
  };
  /** Concept notes that link to a note, or for a book to any of its chapters. */
  const conceptsCiting = n => {
    const targets = new Set([n, ...(state.chaptersOf.get(n.id) || [])]);
    return [...new Set(state.links.filter(([a, b]) => a.concept && targets.has(b)).map(([a]) => a))];
  };
  const obsidian = (file) => `obsidian://open?vault=${encodeURIComponent(state.graph.vaultName)}&file=${encodeURIComponent(file)}`;

  /* ── DOM helpers ────────────────────────────────────────────────────────── */

  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v !== undefined && v !== null && v !== "") e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };
  const h = (tag, props, ...children) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === "style" && typeof v === "object") Object.assign(e.style, v);
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (k === "class") e.className = v;
      else if (k.includes("-")) e.setAttribute(k, v);
      else e[k] = v;
    }
    e.append(...children.flat().filter(c => c !== null && c !== undefined && c !== false));
    return e;
  };
  const icon = (d) => {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    for (const part of d.split("|")) el("path", { d: part }, s);
    return s;
  };
  const ICONS = {
    obsidian: "M14 3h7v7|M10 14 21 3|M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5",
    open: "M2 5.5A1.5 1.5 0 0 1 3.5 4H9a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H3.5A1.5 1.5 0 0 1 2 16z|M22 5.5A1.5 1.5 0 0 0 20.5 4H15a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5h6a1.5 1.5 0 0 0 1.5-1.5z",
    prev: "m15 18-6-6 6-6", next: "m9 18 6-6-6-6", up: "m18 15-6-6-6 6",
    moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
    sun: "M12 3v2|M12 19v2|M5 5l1.4 1.4|M17.6 17.6 19 19|M3 12h2|M19 12h2|M5 19l1.4-1.4|M17.6 6.4 19 5|M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
  };
  const button = (text, onClick, opts = {}) => h("button", { type: "button", class: `btn${opts.primary ? " primary" : ""}`, onclick: onClick, title: opts.title || "" }, opts.icon ? icon(ICONS[opts.icon]) : null, text);
  const link = (text, href) => h("a", { class: "btn", href }, icon(ICONS.obsidian), text);
  const eyebrow = (text, color) => h("span", { class: "eyebrow" }, h("i", { style: { background: color } }), text);
  const card = (...children) => h("section", { class: "card" }, ...children);
  const title3 = text => h("h3", { textContent: text });
  const bar = parts => {
    const total = parts.reduce((s, p) => s + p.value, 0) || 1;
    return h("div", { class: "bar" }, parts.filter(p => p.value > 0).map(p => h("i", { title: `${p.name}: ${p.value}`, style: { width: `${(p.value / total) * 100}%`, background: p.color } })));
  };
  const barLegend = parts => h("div", { class: "bar-legend" }, parts.map(p => h("span", {}, h("i", { class: "mark", style: { background: p.color } }), h("b", { textContent: String(p.value) }), p.name)));
  const rows = pairs => {
    const dl = h("dl", { class: "rows" });
    for (const [k, v] of pairs) dl.append(h("dt", { textContent: k }), h("dd", {}, v));
    return dl;
  };
  const pill = (text, color) => h("span", { class: "pill", style: { color, borderColor: color, background: `color-mix(in srgb, ${color} 12%, transparent)` } }, text);

  /* ── Layout ─────────────────────────────────────────────────────────────── */

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
          const f = ((a.rawRole === "index" || b.rawRole === "index" ? 1400 : 600) / d2) * alpha;
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
    for (const n of state.nodes) if (!n.book && n.hx !== undefined) { n.x = n.hx; n.y = n.hy; }
    for (const [book, chapters] of state.chaptersOf) {
      const b = state.byId.get(book);
      if (!b) continue;
      const { rx, ry } = ringOf(chapters.length);
      chapters.forEach((c, i) => {
        const a = ((i + 0.5) / chapters.length) * Math.PI * 2 - Math.PI / 2;
        c.x = b.x + Math.cos(a) * rx; c.y = b.y + Math.sin(a) * ry; c.angle = a;
      });
      // Other notes never sit inside an open book's ring: push them just outside it,
      // past the chapter labels, for as long as the book is open.
      if (!state.expanded.has(book)) continue;
      const ox = rx + 240, oy = ry + 60;
      for (const n of state.nodes) {
        if (n.book || n === b) continue;
        const dx = n.x - b.x, dy = n.y - b.y, e = Math.hypot(dx / ox, dy / oy);
        if (e >= 1) continue;
        const a = e < 1e-6 ? -Math.PI / 2 : Math.atan2(dy / oy, dx / ox);
        n.x = b.x + Math.cos(a) * ox; n.y = b.y + Math.sin(a) * oy;
      }
    }
  }

  const pageRingOf = count => 18 + count * 3.1;

  /**
   * An open chapter's pages, in order on a small ring just inside the book's ring, between
   * the chapter and its book: chapter labels point outward, so the inside is free of them.
   */
  function pagesOf(c) {
    const pages = (c.distill && c.distill.pages) || [];
    const r = pageRingOf(pages.length);
    const a = c.angle || 0, cx = c.x - Math.cos(a) * (r + 22), cy = c.y - Math.sin(a) * (r + 22);
    return { cx, cy, r, pages: pages.map((p, i) => {
      const t = a + ((i + 0.5) / pages.length) * Math.PI * 2;
      return Object.assign({ chapter: c, x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r }, p);
    }) };
  }

  /* ── Camera ─────────────────────────────────────────────────────────────── */

  /** The part of the screen the graph may use: the canvas minus the floating panels. */
  function viewport() {
    const w = window.innerWidth, hgt = window.innerHeight;
    if (w <= 960) return { x0: 8, x1: w - 8, y0: 76, y1: hgt * 0.45, w, h: hgt };
    const filters = !body.classList.contains("no-filters") && !body.classList.contains("present");
    return { x0: filters ? 304 : 24, x1: w - 424, y0: 92, y1: hgt - 64, w, h: hgt };
  }

  const camera = () => { if (state.root) state.root.setAttribute("transform", `translate(${state.view.x},${state.view.y}) scale(${state.view.k})`); };

  /** The view that puts the box (in graph coordinates) in the middle of the free screen. */
  function viewOf(box, maxK = 1.6) {
    const vp = viewport();
    const bw = Math.max(1, box.x1 - box.x0), bh = Math.max(1, box.y1 - box.y0);
    const k = Math.max(0.12, Math.min(maxK, (vp.x1 - vp.x0) / bw, (vp.y1 - vp.y0) / bh));
    return { k, x: (vp.x0 + vp.x1) / 2 - ((box.x0 + box.x1) / 2) * k, y: (vp.y0 + vp.y1) / 2 - ((box.y0 + box.y1) / 2) * k };
  }

  let flight = 0;
  /** Glide the camera to a view; labels are rebuilt for the new zoom when it lands. */
  function flyTo(to, ms = 700) {
    const id = ++flight, from = { ...state.view }, start = performance.now();
    // Arriving from a link, or with reduced motion, the camera jumps instead of gliding.
    if (state.instant || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { state.view = { ...to }; camera(); render(); return; }
    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = now => {
      if (id !== flight) return;
      const t = ms ? Math.min(1, (now - start) / ms) : 1, e = ease(t);
      state.view = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, k: from.k + (to.k - from.k) * e };
      camera();
      if (t < 1) requestAnimationFrame(step); else render();
    };
    requestAnimationFrame(step);
  }

  const boxAround = (points, pad = 0) => {
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    return { x0: Math.min(...xs) - pad, x1: Math.max(...xs) + pad, y0: Math.min(...ys) - pad, y1: Math.max(...ys) + pad };
  };

  function fitAll(ms) {
    const shown = state.nodes.filter(visible);
    if (shown.length) flyTo(viewOf(boxAround(shown, 60), 1.4), ms);
  }

  /** Zoom so an open book's ring and its labels fit. */
  function frameBook(b, ms) {
    const { rx, ry } = ringOf((state.chaptersOf.get(b.id) || []).length);
    flyTo(viewOf({ x0: b.x - rx - 170, x1: b.x + rx + 170, y0: b.y - ry - 30, y1: b.y + ry + 30 }, 1.2), ms);
  }

  function frameChapter(c, ms) {
    const { cx, cy, r } = pagesOf(c);
    flyTo(viewOf(boxAround([{ x: c.x, y: c.y }, { x: cx - r, y: cy - r }, { x: cx + r, y: cy + r }], 70), 2.2), ms);
  }

  function zoomBy(f) {
    const vp = viewport(), mx = (vp.x0 + vp.x1) / 2, my = (vp.y0 + vp.y1) / 2;
    const k = Math.max(0.12, Math.min(5, state.view.k * f));
    flyTo({ k, x: mx - ((mx - state.view.x) * k) / state.view.k, y: my - ((my - state.view.y) * k) / state.view.k }, 280);
  }

  /* ── Rendering ──────────────────────────────────────────────────────────── */

  /** Label size that stays constant on screen when zoomed out and grows only a little when zoomed in. */
  const fontAt = base => `font-size:${((base * Math.min(1.25, Math.max(1, state.view.k))) / state.view.k).toFixed(2)}px`;

  function render() {
    placeChapters();
    svg.textContent = "";
    const defs = el("defs", {}, svg);
    const glow = el("filter", { id: "glow", x: "-100%", y: "-100%", width: "300%", height: "300%" }, defs);
    el("feGaussianBlur", { stdDeviation: "6", result: "b" }, glow);
    const merge = el("feMerge", {}, glow);
    el("feMergeNode", { in: "b" }, merge);
    el("feMergeNode", { in: "SourceGraphic" }, merge);

    const root = el("g", { class: state.intro ? "intro" : "" }, svg);
    state.root = root;
    camera();

    const shown = new Set(state.nodes.filter(visible).map(n => n.id));
    const edges = el("g", {}, root);
    const drawn = new Set();
    state.adj = new Map();
    const touch = (a, b) => { if (!state.adj.has(a)) state.adj.set(a, new Set()); state.adj.get(a).add(b); };
    for (const [x, y] of state.links) {
      const a = anchor(x), b = anchor(y);
      if (!a || !b || a === b || !shown.has(a.id) || !shown.has(b.id)) continue;
      const key = a.id < b.id ? a.id + "\0" + b.id : b.id + "\0" + a.id;
      if (drawn.has(key)) continue;
      drawn.add(key);
      touch(a.id, b.id); touch(b.id, a.id);
      const spoke = a.book === b.id || b.book === a.id;
      const dim = state.query && !(matches(a) || matches(b));
      let d;
      if (spoke) d = `M${a.x},${a.y}L${b.x},${b.y}`;
      else {
        // A gentle curve, always bowing the same way for the same pair.
        const [p, q] = a.id < b.id ? [a, b] : [b, a];
        const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, dx = q.x - p.x, dy = q.y - p.y;
        d = `M${p.x},${p.y}Q${mx - dy * 0.14},${my + dx * 0.14} ${q.x},${q.y}`;
      }
      el("path", { d, class: `edge${spoke ? " spoke" : ""}${dim ? " dim" : ""}`, "data-a": a.id, "data-b": b.id }, edges);
    }

    // Page rings sit under the nodes so a chapter stays on top of its own ring.
    const pageLayer = el("g", {}, root);
    const nodeLayer = el("g", {}, root);
    const crowded = shown.size > 60;
    const vp = viewport(), cx0 = (vp.x0 + vp.x1) / 2, cy0 = (vp.y0 + vp.y1) / 2;

    for (const n of state.nodes) {
      if (!shown.has(n.id)) continue;
      const degree = (state.adj.get(n.id) || new Set()).size;
      const isBook = n.rawRole === "index";
      const r = isBook ? 15 : n.book ? 6.5 : 5 + Math.min(7, degree) * 0.85;
      const selected = state.selected === n;
      const hit = state.query && matches(n);
      const g = el("g", { class: "node" + (matches(n) ? "" : " dim"), transform: `translate(${n.x},${n.y})`, tabindex: 0, "data-id": n.id, role: "button", "aria-label": n.title }, nodeLayer);
      if (state.intro) {
        const sx = n.x * state.view.k + state.view.x - cx0, sy = n.y * state.view.k + state.view.y - cy0;
        g.style.setProperty("--d", `${Math.min(900, Math.hypot(sx, sy) * 0.9).toFixed(0)}ms`);
      }
      el("circle", { r: r + 10, fill: "transparent" }, g);
      if (selected) el("circle", { r: r + (isBook ? 16 : 11), fill: "none", stroke: "var(--accent)", "stroke-width": 2, class: "pulse" }, g);
      const fill = fillOf(n);
      const stroke = selected ? "var(--text)" : hit ? "var(--accent)" : "var(--halo)";
      const shape = { class: "shape", fill, stroke, "stroke-width": selected || hit ? 2.5 : 2, filter: selected ? "url(#glow)" : "" };

      if (isBook) {
        // The book: a tile ringed by its chapters, green for complete and cyan in progress.
        const { total, complete, progress } = bookCounts(n);
        const R = r + 8, C = 2 * Math.PI * R;
        el("circle", { r: R + 9, fill, opacity: 0.1 }, g);
        el("circle", { r: R, fill: "none", stroke: "var(--line-strong)", "stroke-width": 4 }, g);
        if (total) {
          const done = (complete / total) * C, mid = (progress / total) * C;
          if (mid) el("circle", { r: R, fill: "none", stroke: "var(--bold)", "stroke-width": 4, "stroke-dasharray": `${done + mid} ${C}`, transform: "rotate(-90)", "stroke-linecap": "round" }, g);
          if (done) el("circle", { r: R, fill: "none", stroke: "var(--complete)", "stroke-width": 4, "stroke-dasharray": `${done} ${C}`, transform: "rotate(-90)", "stroke-linecap": "round" }, g);
        }
        el("rect", { x: -r + 3, y: -r + 3, width: 2 * r - 6, height: 2 * r - 6, rx: 6, ...shape }, g);
        el("path", { d: "M0,-5.5V6.5M-6,-5Q-3,-6.5 0,-5.5Q3,-6.5 6,-5V6Q3,5 0,6.5Q-3,5 -6,6Z", fill: "none", stroke: "var(--halo)", "stroke-width": 1.4, "stroke-linejoin": "round", opacity: 0.85 }, g);
      } else {
        const ring = RING[n.mastery] && !n.raw ? { fill: "none", stroke: RING[n.mastery], "stroke-width": 2.5, "stroke-dasharray": n.mastery === "attempted" ? "3 2.5" : "" } : null;
        if (n.raw) {
          el("rect", { x: -r, y: -r, width: 2 * r, height: 2 * r, rx: n.book ? 3 : 2.5, ...shape }, g);
        } else if (n.concept) {
          const s = r + 3, dia = k => `M0,${-k}L${k},0L0,${k}L${-k},0Z`;
          if (ring) el("path", { d: dia(s + 6), ...ring }, g);
          el("path", { d: dia(s), ...shape, "stroke-linejoin": "round" }, g);
        } else {
          if (ring) el("circle", { r: r + 4.5, ...ring }, g);
          el("circle", { r, ...shape }, g);
        }
      }

      const labelled = isBook || selected || hit || state.view.k > 1.3 || (!crowded && (!n.book || state.expanded.has(n.book)));
      const cos = n.book ? Math.cos(n.angle) : 1, sin = n.book ? Math.sin(n.angle) : 0;
      const steep = n.book && Math.abs(cos) < 0.35;
      const off = isBook ? r + 16 : r + 7;
      // A chapter exactly at the top or bottom of the ring centres its label over or under it.
      const centred = isBook || (steep && Math.abs(cos) < 0.06);
      const at = {
        x: centred ? 0 : cos < 0 ? -off : off,
        y: isBook ? r + 32 : steep ? (sin < 0 ? -(r + 7) : r + 16) : 4,
        "text-anchor": centred ? "middle" : cos < 0 ? "end" : "start",
        class: `label${isBook ? " strong" : ""}${labelled ? "" : " quiet"}`,
        style: fontAt(isBook ? 13.5 : 12),
      };
      el("text", at, g).textContent = isBook && n.chapterCount ? `${n.label}  ·  ${n.chaptersComplete || 0}/${n.chapterCount}` : n.label;
      const hint = isBook ? "Click to open or close the book" : n.distill ? "Click to show or hide its pages" : "";
      el("title", {}, g).textContent = [n.title, hint].filter(Boolean).join("\n");

      const open = () => { if (isBook) toggleBook(n); else if (n.distill) togglePages(n); select(n); };
      g.addEventListener("click", ev => { ev.stopPropagation(); if (!drag || !drag.moved) open(); });
      g.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); open(); } });
      g.addEventListener("mouseenter", () => focus(n.id));
      g.addEventListener("mouseleave", () => focus(null));
    }

    for (const id of state.openChapters) {
      const c = state.byId.get(id);
      if (!c || !shown.has(c.id)) continue;
      const { cx, cy, r, pages } = pagesOf(c);
      el("circle", { cx, cy, r, class: "page-ring" }, pageLayer);
      const d = Math.hypot(c.x - cx, c.y - cy) || 1;
      el("path", { d: `M${c.x},${c.y}L${cx + ((c.x - cx) * r) / d},${cy + ((c.y - cy) * r) / d}`, class: "edge spoke" }, pageLayer);
      for (const p of pages) {
        const isSel = state.selected && state.selected.chapter === c && state.selected.page === p.page;
        const g = el("g", { class: "node", transform: `translate(${p.x},${p.y})`, tabindex: 0, role: "button", "aria-label": `Page ${p.page}` }, pageLayer);
        el("circle", { r: 9, fill: "transparent" }, g);
        if (isSel) el("circle", { r: 13, fill: "none", stroke: "var(--accent)", "stroke-width": 2, class: "pulse" }, g);
        if (p.summary) el("circle", { r: 9, fill: "none", stroke: "var(--text)", "stroke-width": 1.6 }, g);
        el("circle", {
          r: isSel ? 6.5 : 5.5, class: "shape", fill: p.empty ? "none" : MARK_FILL[p.mark],
          stroke: isSel ? "var(--text)" : p.empty ? "var(--faint)" : "var(--halo)", "stroke-width": isSel ? 2 : 1.2,
          "stroke-dasharray": p.empty ? "2 2" : "", filter: isSel ? "url(#glow)" : "",
        }, g);
        if (state.view.k > 1.6 || pages.length <= 14 || isSel) {
          const out = Math.atan2(p.y - cy, p.x - cx);
          el("text", {
            x: Math.cos(out) * 12, y: Math.sin(out) * 12 + 3.5, class: "label page",
            "text-anchor": Math.cos(out) < -0.3 ? "end" : Math.cos(out) > 0.3 ? "start" : "middle",
            style: `font-size:${(10.5 / state.view.k).toFixed(2)}px`,
          }, g).textContent = String(p.page);
        }
        el("title", {}, g).textContent = `Page ${p.page} · ${p.empty ? "no text" : label(MARKS, p.mark)}${p.summary ? " · summary" : ""}`;
        g.addEventListener("click", ev => { ev.stopPropagation(); if (!drag || !drag.moved) select(p); });
        g.addEventListener("keydown", ev => { if (ev.key === "Enter") select(p); });
      }
    }
    $("status").textContent = `${shown.size} of ${state.nodes.length} notes`;
  }

  /** Light up a node, its neighbours and the links between them; fade the rest. */
  function focus(id) {
    const root = state.root;
    if (!root || (drag && drag.moved)) return;
    root.classList.toggle("focusing", !!id);
    if (!id) return;
    const near = state.adj.get(id) || new Set();
    for (const g of root.querySelectorAll(".node[data-id]")) g.classList.toggle("lit", g.dataset.id === id || near.has(g.dataset.id));
    for (const e of root.querySelectorAll(".edge[data-a]")) e.classList.toggle("lit", e.dataset.a === id || e.dataset.b === id);
  }

  /* ── Navigation ─────────────────────────────────────────────────────────── */

  function toggleBook(b) {
    if (state.expanded.has(b.id)) {
      state.expanded.delete(b.id);
      for (const c of state.chaptersOf.get(b.id) || []) state.openChapters.delete(c.id);
      flyTo(viewOf({ x0: b.x - 260, x1: b.x + 260, y0: b.y - 200, y1: b.y + 200 }, 1.2));
      return;
    }
    state.expanded.add(b.id);
    placeChapters();
    frameBook(b);
  }

  function togglePages(c) {
    if (state.openChapters.has(c.id)) { state.openChapters.delete(c.id); return; }
    // One chapter open per book keeps the ring readable.
    for (const other of state.chaptersOf.get(c.book) || []) state.openChapters.delete(other.id);
    state.openChapters.add(c.id);
    placeChapters();
    frameChapter(c);
  }

  /** Select a note from the panel: open what it sits in and glide to it. */
  function reveal(n) {
    if (n.book && !state.expanded.has(n.book)) state.expanded.add(n.book);
    placeChapters();
    if (n.rawRole === "index") {
      if (!state.expanded.has(n.id)) toggleBook(n); else frameBook(n);
      select(n);
      return;
    }
    select(n);
    flyTo(viewOf({ x0: n.x - 180, x1: n.x + 180, y0: n.y - 140, y1: n.y + 140 }, 1.6));
  }

  /** Show one page of a chapter, opening the chapter's pages first. */
  function goToPage(c, page) {
    if (!c || !c.distill) return;
    if (c.book) state.expanded.add(c.book);
    const fresh = !state.openChapters.has(c.id);
    if (fresh) togglePages(c);
    placeChapters();
    const p = pagesOf(c).pages.find(x => x.page === page);
    if (p) select(p);
  }

  /** The page before or after the selected one, crossing into the neighbouring chapter. */
  function stepPage(dir) {
    const p = state.selected;
    if (!p || !p.chapter) return;
    const c = p.chapter, pages = c.distill.pages, i = pages.findIndex(x => x.page === p.page) + dir;
    if (i >= 0 && i < pages.length) return goToPage(c, pages[i].page);
    const chapters = state.chaptersOf.get(c.book) || [];
    const next = chapters[chapters.indexOf(c) + dir];
    if (next && next.distill && next.distill.pages.length) goToPage(next, dir > 0 ? next.distill.pages[0].page : next.distill.pages[next.distill.pages.length - 1].page);
  }

  /* ── Side panel ─────────────────────────────────────────────────────────── */

  function select(n) {
    state.selected = n;
    const d = $("detail");
    d.textContent = "";
    if (!n) d.append(...overview());
    else if (n.chapter) d.append(...pagePanel(n));
    else if (n.rawRole === "index") d.append(...bookPanel(n));
    else if (n.distill) d.append(...chapterPanel(n));
    else d.append(...notePanel(n));
    d.scrollTop = 0;
    render();
  }

  function overview() {
    const g = state.graph, nodes = state.nodes;
    const books = nodes.filter(n => n.rawRole === "index");
    const concepts = nodes.filter(n => n.concept);
    const sparrable = nodes.filter(n => n.bucket === "resources" && !n.raw);
    const intro = card(
      eyebrow("Second brain", "var(--accent)"),
      h("h2", { textContent: g.vaultName }),
      h("p", { class: "lede", textContent: "Notes filed by PARA, books distilled page by page, and the concept notes that get sparred. Click a book to open it." }),
      h("div", { class: "tiles", style: { marginTop: "16px" } },
        h("div", { class: "tile" }, h("b", { textContent: String(nodes.length) }), h("span", { textContent: "notes" })),
        h("div", { class: "tile" }, h("b", { textContent: String(g.edges.length) }), h("span", { textContent: "links" })),
        h("div", { class: "tile" }, h("b", { textContent: String(books.length) }), h("span", { textContent: books.length === 1 ? "book" : "books" })),
        h("div", { class: "tile" }, h("b", { textContent: String(concepts.length) }), h("span", { textContent: "concept notes" })),
      ),
    );
    const para = BUCKETS.map(([k, name]) => ({ name, value: nodes.filter(n => bucketOf(n) === k).length, color: `var(--${k})` }));
    const out = [intro, card(title3("Where notes live"), bar(para), barLegend(para.filter(p => p.value)))];
    if (books.length) {
      out.push(card(title3("Reading"), h("ul", { class: "list" }, books.map(b => {
        const c = bookCounts(b);
        return h("li", {}, h("button", { type: "button", onclick: () => reveal(b) },
          h("i", { class: "mark sq", style: { background: fillOf(b), width: "14px", height: "14px" } }),
          h("span", { class: "grow" }, h("b", { textContent: b.title }), h("small", { textContent: `${label(STAGES, b.stage)} · ${c.complete}/${c.total} chapters distilled` }),
            h("div", { style: { marginTop: "8px" } }, bar([
              { name: "Complete", value: c.complete, color: "var(--complete)" },
              { name: "In progress", value: c.progress, color: "var(--bold)" },
              { name: "Not started", value: c.untouched, color: "var(--untouched)" },
            ]))),
        ));
      }))));
    }
    const mastery = MASTERY.map(([k, name]) => ({ name, value: sparrable.filter(n => n.mastery === k).length, color: RING[k] || "var(--untouched)" }));
    out.push(card(title3("Sparring"), bar(mastery), barLegend(mastery),
      h("p", { class: "lede", style: { fontSize: "12.5px" }, textContent: "Resources outside raw material, concept notes above all. Raw text is never sparred." })));
    return out;
  }

  function bookPanel(b) {
    const c = bookCounts(b);
    // Five steps after "not read yet". A stage reached is done, except distilling, which
    // is under way until the book is distilled; the first step not done is the current one.
    const reached = STAGES.findIndex(([k]) => k === b.stage);
    const steps = STAGES.slice(1).map(([key, name], i) => ({ name, done: i + 1 < reached || (i + 1 === reached && key !== "distilling") }));
    const current = steps.findIndex(s => !s.done);
    const doneCount = steps.filter(s => s.done).length;
    const stepper = h("div", { class: "stepper" },
      h("div", { class: "fill", style: { width: `${(Math.max(0, doneCount - 1) / (steps.length - 1)) * 80}%` } }),
      steps.map((s, i) => h("div", { class: `step${s.done ? " done" : ""}${i === current ? " now" : ""}` },
        h("i", { textContent: s.done ? "✓" : String(i + 1) }), h("span", { textContent: s.name }))));
    const parts = [
      { name: "Complete", value: c.complete, color: "var(--complete)" },
      { name: "In progress", value: c.progress, color: "var(--bold)" },
      { name: "Not started", value: c.untouched, color: "var(--untouched)" },
    ];
    const cells = h("div", { class: "cells" }, c.chapters.map((ch, i) => h("button", {
      type: "button", class: "cell", title: `${ch.title} · ${CHAPTER_STATE[ch.distill ? ch.distill.state : "untouched"]}`,
      style: { background: chapterFill(ch) || "var(--untouched)", color: (chapterFill(ch) || MARK_FILL.none) === MARK_FILL.none ? "var(--muted)" : "" }, onclick: () => { reveal(ch); }, textContent: String(i + 1),
    })));
    const concepts = conceptsCiting(b);
    return [
      card(
        eyebrow("Book", fillOf(b)),
        h("h2", { textContent: b.title }),
        h("div", { class: "path", textContent: b.id }),
        h("div", { class: "actions" },
          button(state.expanded.has(b.id) ? "Close book" : "Open book", () => { toggleBook(b); select(b); }, { primary: true, icon: "open" }),
          link("Obsidian", obsidian(b.id.replace(/\.md$/, ""))),
        ),
      ),
      card(title3("Stage"), stepper),
      card(
        title3("Chapters distilled"),
        h("div", { class: "tiles", style: { marginBottom: "14px" } },
          h("div", { class: "tile wide" }, h("b", { textContent: `${c.complete} / ${c.total}` }), h("span", { textContent: "chapters complete — a chapter is complete once its summary is written" })),
        ),
        bar(parts), barLegend(parts),
        h("div", { style: { marginTop: "16px" } }, cells),
      ),
      card(
        title3("Concept notes grounded in it"),
        concepts.length
          ? h("ul", { class: "list" }, concepts.map(cn => h("li", {}, h("button", { type: "button", onclick: () => reveal(cn) },
            h("i", { class: "mark dia", style: { background: fillOf(cn) } }), h("span", { class: "grow" }, h("b", { textContent: cn.title }), h("small", { textContent: label(MASTERY, cn.mastery) }))))))
          : h("p", { class: "muted", style: { margin: 0 }, textContent: "None yet. Raw text is never sparred: distil its ideas into concept notes." }),
      ),
    ];
  }

  function chapterPanel(ch) {
    const d = ch.distill, text = d.pages.filter(p => !p.empty);
    const book = state.byId.get(ch.book);
    const cells = h("div", { class: "cells pages" }, d.pages.map(p => h("button", {
      type: "button", class: `cell${p.empty ? " empty" : ""}${p.summary ? " summ" : ""}`,
      title: `Page ${p.page} · ${p.empty ? "no text" : label(MARKS, p.mark)}${p.summary ? " · summary" : ""}`,
      style: p.empty ? {} : { background: MARK_FILL[p.mark], color: p.mark === "none" ? "var(--muted)" : "" }, textContent: String(p.page),
      onclick: () => goToPage(ch, p.page),
    })));
    const quoted = conceptsCiting(ch);
    return [
      card(
        eyebrow("Chapter", chapterFill(ch)),
        h("h2", { textContent: ch.title }),
        book ? h("button", { type: "button", class: "btn", style: { height: "28px", marginTop: "6px" }, onclick: () => reveal(book) }, icon(ICONS.up), book.title) : null,
        h("div", { class: "actions" },
          button(state.openChapters.has(ch.id) ? "Hide pages" : "Show pages", () => { togglePages(ch); select(ch); }, { primary: true, icon: "open" }),
          link("Obsidian", obsidian(ch.id.replace(/\.md$/, ""))),
        ),
      ),
      card(
        h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" } },
          h("h3", { textContent: "Pages", style: { margin: 0 } }),
          pill(CHAPTER_STATE[d.state], chapterFill(ch))),
        cells,
        h("div", { style: { marginTop: "18px" } }, rows([
          ["Pages bolded", `${text.filter(p => p.mark !== "none").length} of ${text.length}`],
          ["Pages highlighted", String(text.filter(p => p.mark === "highlight").length)],
          ["Page summaries", `${text.filter(p => p.summary).length} (optional)`],
          ["Chapter summary", d.summary ? pill("Written", "var(--complete)") : pill("Not yet", "var(--muted)")],
          ["Quoted by", plural(quoted.length, "concept note")],
        ])),
      ),
    ];
  }

  function pagePanel(p) {
    const c = p.chapter, pages = c.distill.pages, i = pages.findIndex(x => x.page === p.page);
    const chapters = state.chaptersOf.get(c.book) || [];
    const ci = chapters.indexOf(c);
    const hasPrev = i > 0 || ci > 0, hasNext = i < pages.length - 1 || ci < chapters.length - 1;
    const reader = h("div", { class: "reader" }, [100, 92, 96, 70, 98, 88, 60].map(w => h("div", { class: "skeleton", style: { width: `${w}%` } })));
    const pager = h("div", { class: "pager" },
      h("button", { type: "button", class: "btn", disabled: !hasPrev, onclick: () => stepPage(-1), title: "Previous page (←)" }, icon(ICONS.prev), "Prev"),
      h("span", { class: "muted", style: { fontSize: "12.5px" }, textContent: `Page ${i + 1} of ${pages.length} in this chapter` }),
      h("button", { type: "button", class: "btn", disabled: !hasNext, onclick: () => stepPage(1), title: "Next page (→)" }, "Next", icon(ICONS.next)));
    const out = [
      card(
        eyebrow(`Page ${p.page}`, p.empty ? "var(--faint)" : MARK_FILL[p.mark]),
        h("h2", { textContent: c.title }),
        h("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" } },
          pill(p.empty ? "No text" : label(MARKS, p.mark), p.empty ? "var(--muted)" : MARK_FILL[p.mark]),
          p.summary ? pill("Page summary", "var(--complete)") : null),
        h("div", { class: "actions" },
          h("button", { type: "button", class: "btn", onclick: () => reveal(c) }, icon(ICONS.up), "Chapter"),
          link("Edit in Obsidian", obsidian(`${c.id.replace(/\.md$/, "")}#Page ${p.page}`))),
      ),
      card(pager),
      card(reader),
      card(h("p", { class: "muted", style: { margin: 0, fontSize: "12.5px" }, textContent: "Bold what matters with **…**, highlight the best of it with ==…==, and write the chapter summary to complete the chapter." })),
    ];
    fetch(`page.json?note=${encodeURIComponent(c.id)}&page=${p.page}`, { cache: "no-store" })
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(page => { if (state.selected === p) reader.replaceChildren(...pageText(page.text)); })
      .catch(() => { if (state.selected === p) reader.replaceChildren(h("p", { class: "muted", textContent: "Could not load the page." })); });
    return out;
  }

  function notePanel(n) {
    const near = [...(state.adj.get(n.id) || [])].map(id => state.byId.get(id)).filter(Boolean);
    const kind = n.concept ? "Concept note" : n.raw ? "Raw resource" : "Note";
    const color = fillOf(n);
    return [
      card(
        eyebrow(kind, color),
        h("h2", { textContent: n.title }),
        h("div", { class: "path", textContent: n.id }),
        h("div", { class: "actions" }, link("Open in Obsidian", obsidian(n.id.replace(/\.md$/, "")))),
      ),
      card(rows([
        ["PARA", label(BUCKETS, bucketOf(n))],
        ...(n.raw ? [["Quoted by", plural(conceptsCiting(n).length, "concept note")]] : [
          ["Mastery", pill(label(MASTERY, n.mastery), RING[n.mastery] || "var(--muted)")],
          ["Next review", n.nextReview || "—"],
        ]),
        ["Links", String(near.length)],
      ])),
      near.length ? card(title3("Linked"), h("ul", { class: "list" }, near.slice(0, 12).map(m => h("li", {}, h("button", { type: "button", onclick: () => reveal(m) },
        h("i", { class: `mark${m.concept ? " dia" : m.raw ? " sq" : ""}`, style: { background: fillOf(m) } }),
        h("span", { class: "grow" }, h("b", { textContent: m.title }), h("small", { textContent: label(BUCKETS, bucketOf(m)) }))))))) : null,
    ].filter(Boolean);
  }

  /**
   * A page's markdown as DOM, built from text nodes only: paragraphs (the PDF's hard line
   * breaks joined), **bold** as <strong>, ==highlight== as <mark>, and a summary callout
   * as a box. Nothing from the page is parsed as HTML.
   */
  function pageText(md) {
    const out = [];
    for (const block of md.split(/\n[ \t]*\n/)) {
      const lines = block.split("\n").filter(l => l.trim());
      if (!lines.length) continue;
      if (/^>\s*\[!summary\]/i.test(lines[0])) {
        const text = [lines[0].replace(/^>\s*\[!summary\][-+]?/i, ""), ...lines.slice(1).map(l => l.replace(/^>\s?/, ""))].join(" ").trim();
        out.push(h("div", { class: "summary-box" }, h("b", { textContent: "My summary" }), ...inline(text)));
        continue;
      }
      if (lines.length === 1 && lines[0].trim() === "_(no text on this page)_") { out.push(h("p", { class: "muted", textContent: "No text on this page." })); continue; }
      // The PDF gives no blank lines between paragraphs, so a line well short of the
      // page's full width ends one when it ends a sentence or reads as a Title Case heading.
      const full = Math.max(...lines.map(l => l.length));
      const heading = l => {
        const words = l.split(/\s+/).filter(w => /\p{L}/u.test(w));
        return words.length > 0 && !/[.,;:!?]["”’)]?$/.test(l) && words.filter(w => /^\p{Lu}/u.test(w) || w.length <= 3).length / words.length >= 0.8;
      };
      let para = [];
      const flush = () => { if (para.length) out.push(h("p", {}, ...inline(para.join(" ")))); para = []; };
      for (const raw of lines) {
        const line = raw.replace(/^\\/, "");
        const short = line.length < full * 0.7;
        if (short && heading(line)) { flush(); out.push(h("div", { class: "head" }, ...inline(line))); continue; }
        para.push(line);
        if (short && /[.!?:]["”’)]?$/.test(line)) flush();
      }
      flush();
    }
    return out.length ? out : [h("p", { class: "muted", textContent: "No text on this page." })];
  }

  /** Split on ** / __ / == markers, toggling bold and highlight. */
  function inline(text) {
    const nodes = [];
    let bold = false, high = false;
    for (const part of text.split(/(\*\*|__|==)/)) {
      if (part === "**" || part === "__") { bold = !bold; continue; }
      if (part === "==") { high = !high; continue; }
      if (!part) continue;
      let node = document.createTextNode(part);
      if (high) node = h("mark", {}, node);
      if (bold) node = h("strong", {}, node);
      nodes.push(node);
    }
    return nodes;
  }

  /* ── Filters, header, theme ─────────────────────────────────────────────── */

  function filters() {
    const build = (host, list, set, count, mark) => {
      host.textContent = "";
      for (const [key, name] of list) {
        const chip = h("button", { type: "button", class: `chip${set.has(key) ? " off" : ""}`, "aria-pressed": String(!set.has(key)) },
          mark(key), h("span", { class: "name", textContent: name }), h("span", { class: "count", textContent: String(count(key)) }));
        chip.addEventListener("click", () => { set.has(key) ? set.delete(key) : set.add(key); chip.classList.toggle("off", set.has(key)); render(); });
        host.append(chip);
      }
    };
    const dot = (cls, color) => h("i", { class: `mark${cls ? " " + cls : ""}`, style: { background: color } });
    build($("buckets"), BUCKETS, state.hidden, k => state.nodes.filter(n => bucketOf(n) === k).length, k => dot("", `var(--${k})`));
    build($("kinds"), KINDS.map(([k, n]) => [k, n]), state.hiddenKinds, k => state.nodes.filter(n => kindOf(n) === k).length, k => dot(KINDS.find(x => x[0] === k)[2], "var(--muted)"));
    build($("mastery"), MASTERY, state.hiddenMastery, k => state.nodes.filter(n => !n.raw && n.mastery === k).length, k => {
      const s = h("i", { class: "mark ring", style: { borderColor: RING[k] || "var(--line-strong)" } });
      if (k === "attempted") s.style.borderStyle = "dashed";
      return s;
    });
    const legend = $("distill");
    legend.textContent = "";
    for (const [color, name, cls] of [["var(--untouched)", "Not marked", ""], ["var(--bold)", "Bolded", ""], ["var(--highlight)", "Highlighted", ""], ["var(--complete)", "Complete", "sq"], ["var(--text)", "Has a summary", "ring"]]) {
      legend.append(h("span", {}, h("i", { class: `mark${cls ? " " + cls : ""}`, style: cls === "ring" ? { borderColor: color } : { background: color } }), name));
    }
  }

  function header() {
    const g = state.graph, nodes = state.nodes;
    const books = nodes.filter(n => n.rawRole === "index").length;
    const concepts = nodes.filter(n => n.concept).length;
    const passed = nodes.filter(n => !n.raw && n.mastery === "tier2_passed").length;
    $("title").textContent = g.vaultName;
    const at = new Date(g.generatedAt);
    $("subtitle").textContent = `Second brain · updated ${at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    document.title = `${g.vaultName} · vault graph`;
    $("kpis").replaceChildren(...[[nodes.length, "notes"], [g.edges.length, "links"], [books, books === 1 ? "book" : "books"], [concepts, "concepts"], [passed, "mastered"]]
      .map(([v, k]) => h("div", { class: "kpi" }, h("b", { textContent: String(v) }), h("span", { textContent: k }))));
  }

  function setTheme(theme, save) {
    document.documentElement.dataset.theme = theme;
    $("theme").replaceChildren(icon(theme === "dark" ? ICONS.sun : ICONS.moon));
    $("theme").title = theme === "dark" ? "Switch to light" : "Switch to dark";
    if (save) try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage unavailable */ }
  }

  function togglePresent(on) {
    const now = on ?? !body.classList.contains("present");
    body.classList.toggle("present", now);
    $("present").setAttribute("aria-pressed", String(now));
    if (now && !document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    if (!now && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }

  /* ── Loading ────────────────────────────────────────────────────────────── */

  async function load() {
    $("status").textContent = "Loading…";
    const res = await fetch("graph.json", { cache: "no-store" });
    if (!res.ok) { $("status").textContent = `Could not load the graph: ${res.status}`; return; }
    const graph = await res.json();
    const keepView = !!state.graph;
    const before = new Map(state.nodes.map(n => [n.id, { x: n.hx ?? n.x, y: n.hy ?? n.y }]));
    state.graph = graph;
    state.nodes = graph.nodes.map(n => Object.assign({}, n));
    state.byId = new Map(state.nodes.map(n => [n.id, n]));
    state.chaptersOf = new Map();
    for (const n of state.nodes) if (n.book) state.chaptersOf.set(n.book, [...(state.chaptersOf.get(n.book) || []), n]);
    for (const list of state.chaptersOf.values()) list.sort((a, b) => (a.id < b.id ? -1 : 1));
    state.expanded = new Set([...state.expanded].filter(id => state.byId.has(id)));
    state.openChapters = new Set([...state.openChapters].filter(id => state.byId.has(id)));
    if (location.hash === "#open-books") state.expanded = new Set(state.chaptersOf.keys());
    state.links = graph.edges.map(e => [state.byId.get(e.source), state.byId.get(e.target)]).filter(([a, b]) => a && b);
    layout(window.innerWidth, window.innerHeight);
    // A refresh keeps every note that was already on screen where it was.
    if (keepView) for (const n of state.nodes) { const at = before.get(n.id); if (at && !n.book) Object.assign(n, at); }
    for (const n of state.nodes) if (!n.book) { n.hx = n.x; n.hy = n.y; }
    placeChapters();
    header();
    filters();

    // #open=<chapter path>[&page=N] opens the chapter's book and its pages, and selects a page.
    const hash = new URLSearchParams(location.hash.slice(1));
    const deep = hash.has("open") ? state.byId.get(hash.get("open")) : null;
    if (!keepView) {
      state.intro = true;
      const shown = state.nodes.filter(visible);
      if (shown.length) state.view = viewOf(boxAround(shown, 60), 1.4);
      setTimeout(() => { state.intro = false; }, 1600);
    }
    state.instant = true;
    if (deep && deep.distill) {
      state.expanded.add(deep.book);
      placeChapters();
      const page = deep.distill.pages.find(p => p.page === Number(hash.get("page")));
      togglePages(deep);
      if (page) goToPage(deep, page.page); else select(deep);
    } else if (deep) {
      reveal(deep);
    } else if (state.expanded.size === 1 && !keepView) {
      const b = state.byId.get([...state.expanded][0]);
      select(b);
      frameBook(b, 0);
    } else {
      select(keepView && state.selected && !state.selected.chapter ? state.byId.get(state.selected.id) || null : null);
    }
    state.instant = false;
  }

  /* ── Input ──────────────────────────────────────────────────────────────── */

  let drag = null, wheelFrame = 0;
  svg.addEventListener("pointerdown", ev => {
    flight++;
    drag = { x: ev.clientX, y: ev.clientY, vx: state.view.x, vy: state.view.y, moved: false };
  });
  window.addEventListener("pointermove", ev => {
    if (!drag) return;
    if (!drag.moved && Math.abs(ev.clientX - drag.x) + Math.abs(ev.clientY - drag.y) > 4) {
      drag.moved = true;
      svg.classList.add("dragging");
      if (state.root) state.root.classList.remove("focusing");
    }
    if (!drag.moved) return;
    state.view.x = drag.vx + ev.clientX - drag.x; state.view.y = drag.vy + ev.clientY - drag.y;
    camera();
  });
  window.addEventListener("pointerup", () => {
    svg.classList.remove("dragging");
    setTimeout(() => { drag = null; }, 0);
  });
  svg.addEventListener("wheel", ev => {
    ev.preventDefault();
    flight++;
    const box = svg.getBoundingClientRect(), mx = ev.clientX - box.left, my = ev.clientY - box.top;
    const k = Math.max(0.12, Math.min(5, state.view.k * Math.exp(-ev.deltaY * (ev.ctrlKey ? 0.01 : 0.0018))));
    state.view.x = mx - ((mx - state.view.x) * k) / state.view.k; state.view.y = my - ((my - state.view.y) * k) / state.view.k; state.view.k = k;
    camera();
    cancelAnimationFrame(wheelFrame);
    wheelFrame = requestAnimationFrame(render);
  }, { passive: false });
  svg.addEventListener("click", () => { if (!drag || !drag.moved) select(null); });

  $("search").addEventListener("input", ev => { state.query = ev.target.value.trim().toLowerCase(); render(); });
  $("search").addEventListener("keydown", ev => {
    if (ev.key === "Enter") {
      const hit = state.nodes.filter(visible).find(n => state.query && matches(n)) || state.nodes.find(n => state.query && matches(n));
      if (hit) reveal(hit);
    }
    if (ev.key === "Escape") { ev.target.value = ""; state.query = ""; ev.target.blur(); render(); }
  });
  $("refresh").addEventListener("click", load);
  $("fit").addEventListener("click", () => fitAll());
  $("zoom-in").addEventListener("click", () => zoomBy(1.35));
  $("zoom-out").addEventListener("click", () => zoomBy(1 / 1.35));
  $("present").addEventListener("click", () => togglePresent());
  $("theme").addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true));
  $("toggle-filters").addEventListener("click", () => {
    const hidden = body.classList.toggle("no-filters");
    $("toggle-filters").setAttribute("aria-pressed", String(!hidden));
  });
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && body.classList.contains("present")) togglePresent(false); });
  window.addEventListener("resize", () => { cancelAnimationFrame(wheelFrame); wheelFrame = requestAnimationFrame(render); });

  document.addEventListener("keydown", ev => {
    if (ev.target instanceof HTMLInputElement || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const s = state.selected;
    switch (ev.key) {
      case "/": ev.preventDefault(); body.classList.remove("no-filters"); $("toggle-filters").setAttribute("aria-pressed", "true"); $("search").focus(); break;
      case "f": case "F": fitAll(); break;
      case "p": case "P": togglePresent(); break;
      case "+": case "=": zoomBy(1.35); break;
      case "-": case "_": zoomBy(1 / 1.35); break;
      case "ArrowRight":
        if (s && s.chapter) { ev.preventDefault(); stepPage(1); } else if (s && s.distill && s.distill.pages.length) { ev.preventDefault(); goToPage(s, s.distill.pages[0].page); }
        break;
      case "ArrowLeft": if (s && s.chapter) { ev.preventDefault(); stepPage(-1); } break;
      case "Escape":
        if (body.classList.contains("present") && !s) togglePresent(false);
        else if (s && s.chapter) reveal(s.chapter);
        else if (s && s.book) reveal(state.byId.get(s.book));
        else select(null);
        break;
      default: return;
    }
  });

  // ?theme=light|dark and ?present set up a demo machine from its bookmark.
  const query = new URLSearchParams(location.search);
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch { /* storage unavailable */ }
  const theme = query.get("theme") || saved;
  setTheme(theme === "light" ? "light" : "dark", false);
  if (query.has("present")) { body.classList.add("present"); $("present").setAttribute("aria-pressed", "true"); }
  load();
})();
