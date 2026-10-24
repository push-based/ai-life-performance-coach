/* Vault graph view (ADR-KI-0058 Decision 11). Self-contained: no library and no
 * request beyond /graph.json, so it runs offline and its CSP can forbid the rest.
 * A converted book (ADR-KI-0059) shows as one node until it is opened; its chapters
 * then sit in reading order on a ring around it. Concept notes (ADR-KI-0060), the notes
 * that are sparred, are diamonds; their links to the chapters they quote show which
 * books ground them. Raw text is coloured by how far it is distilled (ADR-KI-0061): an
 * open chapter shows its pages, each coloured by its deepest mark and ringed when it has
 * a summary; a chapter turns green once its chapter summary is written. */
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
  const STAGES = [
    ["unread", "Not read yet"], ["read", "Read"], ["notes", "Notes taken"], ["distilling", "Distilling"], ["distilled", "Distilled"], ["concepts", "Concepts written"],
  ];
  const STAGE_FILL = { unread: "var(--untouched)", read: "var(--resources)", notes: "var(--resources)", distilling: "var(--bold)", distilled: "var(--complete)", concepts: "var(--complete)" };
  const MARK_FILL = { none: "var(--untouched)", bold: "var(--bold)", highlight: "var(--highlight)" };
  const MARKS = [["none", "Not marked"], ["bold", "Bolded"], ["highlight", "Highlighted"]];
  /** A chapter's colour: green when complete, else its deepest mark so far. */
  const chapterFill = c => {
    const d = c.distill;
    if (!d) return null;
    if (d.state === "complete") return "var(--complete)";
    return MARK_FILL[d.pages.some(p => p.mark === "highlight") ? "highlight" : d.pages.some(p => p.mark === "bold") ? "bold" : "none"];
  };
  const NS = "http://www.w3.org/2000/svg";
  const $ = id => document.getElementById(id);
  const svg = $("graph");
  const state = {
    graph: null, nodes: [], byId: new Map(), chaptersOf: new Map(), links: [],
    view: { x: 0, y: 0, k: 1 }, hidden: new Set(["archive"]), hiddenMastery: new Set(), hideRaw: false,
    expanded: new Set(), openChapters: new Set(), query: "", selected: null,
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
  const labelOf = n => (n.rawRole === "index" && n.chapterCount ? `${n.label} · ${n.chaptersComplete || 0}/${n.chapterCount}` : n.label);
  /** Where an edge end is drawn: a folded chapter's edges attach to its book. */
  const anchor = n => (folded(n) ? state.byId.get(n.book) : n);
  /** Concept notes that link to a note, or for a book to any of its chapters. */
  const conceptsCiting = n => {
    const targets = new Set([n, ...(state.chaptersOf.get(n.id) || [])]);
    return [...new Set(state.links.filter(([a, b]) => a.concept && targets.has(b)).map(([a]) => a))];
  };

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

  const pageRingOf = count => 16 + count * 2.6;

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
      const fill = n.rawRole === "index" && n.stage ? STAGE_FILL[n.stage] : chapterFill(n) || `var(--${bucketOf(n)})`;
      const body = { fill, stroke: state.selected === n ? "var(--text)" : "var(--bg)", "stroke-width": state.selected === n ? 2.5 : 1.5 };
      if (n.raw) {
        const s = r + 2;
        if (RING[n.mastery]) el("rect", { x: -s - 4, y: -s - 4, width: 2 * s + 8, height: 2 * s + 8, rx: 3, ...ring }, g);
        el("rect", { x: -s, y: -s, width: 2 * s, height: 2 * s, rx: 2, ...body }, g);
      } else if (n.concept) {
        const s = r + 3, d = (k) => `M0,${-k} L${k},0 L0,${k} L${-k},0 Z`;
        if (RING[n.mastery]) el("path", { d: d(s + 5), ...ring }, g);
        el("path", { d: d(s), ...body }, g);
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
        // Keep labels the same size on screen when zoomed out, and grow them only a little when zoomed in.
        // An inline style, because the stylesheet's font-size would win over the attribute.
        if (state.view.k !== 1) at.style = `font-size:${((11 * Math.min(1.25, Math.max(1, state.view.k))) / state.view.k).toFixed(1)}px`;
        el("text", at, g).textContent = labelOf(n);
      }
      const hint = n.rawRole === "index" ? "\nClick to open or close the book" : n.distill ? "\nClick to show or hide its pages" : "";
      el("title", {}, g).textContent = `${n.title}\n${n.id}${hint}`;
      const open = () => { if (n.rawRole === "index") toggle(n.id); else if (n.distill) togglePages(n); select(n); };
      g.addEventListener("click", ev => { ev.stopPropagation(); open(); });
      g.addEventListener("keydown", ev => { if (ev.key === "Enter") open(); });
    }
    for (const id of state.openChapters) {
      const c = state.byId.get(id);
      if (!c || !shown.has(c.id)) continue;
      const { cx, cy, r, pages } = pagesOf(c);
      el("circle", { cx, cy, r, fill: "none", stroke: "var(--edge)", "stroke-dasharray": "2 3" }, root);
      el("line", { x1: c.x, y1: c.y, x2: cx + (c.x - cx) * (1 - r / Math.hypot(c.x - cx, c.y - cy)), y2: cy + (c.y - cy) * (1 - r / Math.hypot(c.x - cx, c.y - cy)), stroke: "var(--edge)", "stroke-dasharray": "2 3" }, root);
      for (const p of pages) {
        const g = el("g", { class: "node", transform: `translate(${p.x},${p.y})`, tabindex: 0 }, root);
        if (p.summary) el("circle", { r: 6.5, fill: "none", stroke: "var(--text)", "stroke-width": 1.5 }, g);
        const isSel = state.selected && state.selected.chapter === c && state.selected.page === p.page;
        el("circle", { r: 4, fill: p.empty ? "none" : MARK_FILL[p.mark], stroke: isSel ? "var(--text)" : p.empty ? "var(--untouched)" : "var(--bg)", "stroke-width": isSel ? 2 : 1 }, g);
        if (state.view.k > 1.6 || pages.length <= 12) {
          const out = Math.atan2(p.y - cy, p.x - cx);
          const at = { x: Math.cos(out) * 8, y: Math.sin(out) * 8 + 3, "text-anchor": Math.cos(out) < -0.3 ? "end" : Math.cos(out) > 0.3 ? "start" : "middle" };
          // Page numbers stay 11px on screen at any zoom.
          at.style = `font-size:${(11 / state.view.k).toFixed(1)}px`;
          el("text", at, g).textContent = String(p.page);
        }
        el("title", {}, g).textContent = `Page ${p.page} · ${p.empty ? "no text" : label(MARKS, p.mark)}${p.summary ? " · summary" : ""}`;
        g.addEventListener("click", ev => { ev.stopPropagation(); select(p); });
      }
    }
    $("status").textContent = `${shown.size} of ${state.nodes.length} notes shown · click a book to open it, a chapter to see its pages · scroll to zoom, drag to pan`;
  }

  function togglePages(c) {
    if (state.openChapters.has(c.id)) { state.openChapters.delete(c.id); return; }
    state.openChapters.add(c.id);
    const { cx, cy, r } = pagesOf(c);
    const box = svg.getBoundingClientRect();
    const w = box.width || 900, h = box.height || 700;
    state.view.k = Math.max(state.view.k, Math.min(1.8, (Math.min(w, h) / 2 - 60) / (r + 40)));
    state.view.x = w / 2 - ((cx + c.x) / 2) * state.view.k;
    state.view.y = h / 2 - ((cy + c.y) / 2) * state.view.k;
  }

  const label = (list, key) => (list.find(([k]) => k === key) || [key, key])[1];

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

  /** A page of an open chapter: its marks and summary, and a link to it in Obsidian. */
  function selectPage(p) {
    const d = $("detail");
    const h = html("h2", { textContent: `${p.chapter.label} · page ${p.page}` });
    h.style.textTransform = "none"; h.style.fontSize = "15px"; h.style.color = "var(--text)";
    const dl = html("dl");
    for (const [k, v] of [["Chapter", p.chapter.title], ["Marked", p.empty ? "No text on this page" : label(MARKS, p.mark)], ["Page summary", p.summary ? "Yes" : "No (optional)"]]) dl.append(html("dt", { textContent: k }), html("dd", { textContent: v }));
    const file = `${p.chapter.id.replace(/\.md$/, "")}#Page ${p.page}`;
    const open = html("a", { href: `obsidian://open?vault=${encodeURIComponent(state.graph.vaultName)}&file=${encodeURIComponent(file)}`, textContent: "Open the page in Obsidian" });
    const text = html("div", { className: "page-text" }, html("p", { className: "empty", textContent: "Loading the page…" }));
    d.append(h, dl, html("p", {}, open), text, html("p", { className: "empty", textContent: "Bold with **…**, then highlight the best of it with ==…==. Write the chapter summary to complete the chapter." }));
    render();
    fetch(`page.json?note=${encodeURIComponent(p.chapter.id)}&page=${p.page}`, { cache: "no-store" })
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(page => { if (state.selected === p) text.replaceChildren(...pageText(page.text)); })
      .catch(() => { if (state.selected === p) text.replaceChildren(html("p", { className: "empty", textContent: "Could not load the page." })); });
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
        const body = [lines[0].replace(/^>\s*\[!summary\][-+]?/i, ""), ...lines.slice(1).map(l => l.replace(/^>\s?/, ""))].join(" ").trim();
        out.push(html("div", { className: "summary" }, html("b", { textContent: "My summary" }), ...inline(body)));
        continue;
      }
      if (lines.length === 1 && lines[0].trim() === "_(no text on this page)_") { out.push(html("p", { className: "empty", textContent: "No text on this page." })); continue; }
      // The PDF gives no blank lines between paragraphs, so a line well short of the
      // page's full width ends one when it ends a sentence or reads as a Title Case heading.
      const full = Math.max(...lines.map(l => l.length));
      const heading = l => {
        const words = l.split(/\s+/).filter(w => /\p{L}/u.test(w));
        return words.length > 0 && !/[.,;:!?]["”’)]?$/.test(l) && words.filter(w => /^\p{Lu}/u.test(w) || w.length <= 3).length / words.length >= 0.8;
      };
      let para = [];
      const flush = () => { if (para.length) out.push(html("p", {}, ...inline(para.join(" ")))); para = []; };
      for (const raw of lines) {
        const line = raw.replace(/^\\/, "");
        const short = line.length < full * 0.7;
        if (short && heading(line)) { flush(); out.push(html("p", {}, html("strong", {}, ...inline(line)))); continue; }
        para.push(line);
        if (short && /[.!?:]["”’)]?$/.test(line)) flush();
      }
      flush();
    }
    return out.length ? out : [html("p", { className: "empty", textContent: "No text on this page." })];
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
      if (high) node = html("mark", {}, node);
      if (bold) node = html("strong", {}, node);
      nodes.push(node);
    }
    return nodes;
  }

  function select(n) {
    state.selected = n;
    const d = $("detail");
    d.textContent = "";
    if (n && n.chapter) return selectPage(n);
    if (!n) { d.appendChild(html("p", { className: "empty", textContent: "Select a note to see its PARA location and sparring state. Click a book to open its chapters." })); render(); return; }
    const h = html("h2", { textContent: n.title });
    h.style.textTransform = "none"; h.style.fontSize = "15px"; h.style.color = "var(--text)";
    const dl = html("dl");
    const rows = [["Path", n.id], ["Bucket", label(BUCKETS, bucketOf(n)) + (n.raw ? " · raw resource" : n.concept ? " · concept" : "")]];
    if (n.rawRole === "index") rows.push(["Stage", label(STAGES, n.stage)], ["Chapters complete", `${n.chaptersComplete || 0} of ${n.chapterCount}`]);
    if (n.distill) {
      const ps = n.distill.pages.filter(p => !p.empty);
      rows.push(
        ["Distilling", n.distill.state === "complete" ? "Complete" : n.distill.state === "in_progress" ? "In progress" : "Not started"],
        ["Pages bolded", `${ps.filter(p => p.mark !== "none").length} of ${ps.length}`],
        ["Highlighted", String(ps.filter(p => p.mark === "highlight").length)],
        ["Page summaries", String(ps.filter(p => p.summary).length)],
        ["Chapter summary", n.distill.summary ? "Written" : "Not yet"],
      );
    }
    if (n.raw) rows.push(["Quoted by", `${conceptsCiting(n).length} concept note(s)`]);
    else rows.push(["Mastery", label(MASTERY, n.mastery)], ["Next review", n.nextReview || "—"]);
    rows.push(["Links", String(state.links.filter(([a, b]) => a === n || b === n).length)]);
    for (const [k, v] of rows) dl.append(html("dt", { textContent: k }), html("dd", { textContent: v }));
    const open = html("a", { href: `obsidian://open?vault=${encodeURIComponent(state.graph.vaultName)}&file=${encodeURIComponent(n.id.replace(/\.md$/, ""))}`, textContent: "Open in Obsidian" });
    d.append(h, dl, html("p", {}, open));
    if (n.distill) {
      const btn = html("button", { type: "button", textContent: state.openChapters.has(n.id) ? "Hide pages" : "Show pages" });
      btn.addEventListener("click", () => { togglePages(n); select(n); });
      d.append(html("p", {}, btn));
    }
    if (n.rawRole === "index") {
      const steps = html("ol");
      steps.style.paddingLeft = "18px";
      const reached = STAGES.findIndex(([k]) => k === n.stage);
      for (const [k, name] of STAGES.slice(1)) {
        const i = STAGES.findIndex(([x]) => x === k);
        const li = html("li", { textContent: `${i <= reached ? "✓" : "·"} ${name}` });
        li.style.color = i <= reached ? "var(--text)" : "var(--muted)";
        steps.append(li);
      }
      d.append(steps);
      const chapters = state.chaptersOf.get(n.id) || [];
      const concepts = conceptsCiting(n);
      d.append(html("p", { textContent: concepts.length
        ? `Grounds ${concepts.length} concept note${concepts.length === 1 ? "" : "s"}. Raw text is not sparred; its concepts are.`
        : "No concept note quotes this book yet. Raw text is not sparred; distil its ideas into concept notes." }));
      if (concepts.length) {
        const ul = html("ul");
        ul.style.paddingLeft = "18px";
        for (const c of concepts) {
          const a = html("a", { href: "#", textContent: c.label });
          a.addEventListener("click", ev => { ev.preventDefault(); select(c); });
          const li = html("li", {}, a, ` · ${label(MASTERY, c.mastery)}`);
          li.style.color = RING[c.mastery] || "var(--muted)";
          a.style.color = "var(--text)";
          ul.append(li);
        }
        d.append(ul);
      }
      const btn = html("button", { type: "button", textContent: state.expanded.has(n.id) ? "Close book" : "Open book" });
      btn.addEventListener("click", () => { toggle(n.id); select(n); });
      d.append(html("p", {}, btn));
      const list = html("ol");
      list.style.paddingLeft = "18px";
      for (const c of chapters) {
        const a = html("a", { href: "#", textContent: c.label });
        a.addEventListener("click", ev => { ev.preventDefault(); state.expanded.add(n.id); select(c); });
        const quoted = conceptsCiting(c).length;
        const progress = c.distill ? (c.distill.state === "complete" ? "complete" : c.distill.state === "in_progress" ? "in progress" : "") : "";
        const li = html("li", {}, a, [progress, quoted ? `quoted by ${quoted}` : ""].filter(Boolean).map(s => ` · ${s}`).join(""));
        li.style.color = chapterFill(c) || "var(--muted)";
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
    const dia = html("span", { className: "swatch" }); dia.style.background = "var(--resources)"; dia.style.transform = "rotate(45deg) scale(0.8)";
    $("buckets").appendChild(html("label", {}, html("span", { style: "display:inline-block;width:13px" }), dia, document.createTextNode("Concept notes (diamond)"), html("span", { className: "count", textContent: state.nodes.filter(n => n.concept).length })));
    const legend = $("distill");
    legend.textContent = "";
    for (const [fill, name, ring] of [["var(--untouched)", "Not marked"], ["var(--bold)", "Bolded"], ["var(--highlight)", "Highlighted"], ["none", "Has a summary", true], ["var(--complete)", "Chapter complete"]]) {
      const s = html("span", { className: ring ? "ring" : "swatch" });
      if (ring) { s.style.borderColor = "var(--text)"; s.style.borderWidth = "2px"; } else s.style.background = fill;
      legend.appendChild(html("label", {}, s, document.createTextNode(name)));
    }
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
    // #open=<chapter path>[&page=N] opens the chapter's book and its pages, and selects a page.
    const hash = new URLSearchParams(location.hash.slice(1));
    const deep = hash.has("open") ? state.byId.get(hash.get("open")) : null;
    const by = m => state.nodes.filter(n => n.mastery === m && !n.raw).length;
    const books = state.nodes.filter(n => n.rawRole === "index").length;
    const concepts = state.nodes.filter(n => n.concept).length;
    $("title").textContent = `${graph.vaultName} — vault graph`;
    $("stats").textContent = `${state.nodes.length} notes · ${graph.edges.length} links · ${books} book${books === 1 ? "" : "s"} · ${concepts} concept${concepts === 1 ? "" : "s"} · ${by("tier2_passed")} Tier 2 passed · ${by("tier1_passed")} Tier 1 passed · ${by("attempted")} attempted`;
    filters();
    if (deep && deep.distill) {
      state.expanded.add(deep.book);
      placeChapters();
      togglePages(deep);
      const page = deep.distill.pages.find(p => p.page === Number(hash.get("page")));
      if (page) render();
      select(page ? pagesOf(deep).pages.find(p => p.page === page.page) : deep);
    } else select(null);
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
