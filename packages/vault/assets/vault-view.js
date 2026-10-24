/* Vault graph view (ADR-KI-0058 Decision 11). Self-contained: no library and no
 * request beyond /graph.json, so it runs offline and its CSP can forbid the rest. */
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
  const state = { graph: null, nodes: [], edges: [], view: { x: 0, y: 0, k: 1 }, hidden: new Set(["archive"]), hiddenMastery: new Set(), query: "", selected: null };

  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };
  const bucketOf = n => n.bucket || "none";
  const visible = n => !state.hidden.has(bucketOf(n)) && !state.hiddenMastery.has(n.mastery);
  const matches = n => !state.query || (n.title + " " + n.id).toLowerCase().includes(state.query);

  /* Force layout: pairwise repulsion, link springs, and a pull towards each bucket's
   * own anchor so PARA buckets form visible clusters. Runs to rest, then stops. */
  function layout(nodes, edges, w, h) {
    const anchors = {};
    BUCKETS.forEach(([b], i) => {
      const a = (i / BUCKETS.length) * Math.PI * 2 - Math.PI / 2;
      anchors[b] = { x: w / 2 + Math.cos(a) * w * 0.28, y: h / 2 + Math.sin(a) * h * 0.28 };
    });
    for (const n of nodes) {
      const a = anchors[bucketOf(n)];
      n.x = a.x + (Math.random() - 0.5) * 80; n.y = a.y + (Math.random() - 0.5) * 80; n.vx = 0; n.vy = 0;
    }
    const byId = new Map(nodes.map(n => [n.id, n]));
    const links = edges.map(e => [byId.get(e.source), byId.get(e.target)]).filter(([a, b]) => a && b);
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
      for (const [a, b] of links) {
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
    return links;
  }

  function render() {
    svg.textContent = "";
    const root = el("g", { transform: `translate(${state.view.x},${state.view.y}) scale(${state.view.k})` }, svg);
    const shown = new Set(state.nodes.filter(visible).map(n => n.id));
    const edgeLayer = el("g", { stroke: "var(--edge)", "stroke-width": 1.2 }, root);
    for (const [a, b] of state.links) {
      if (!shown.has(a.id) || !shown.has(b.id)) continue;
      const dim = state.query && !(matches(a) || matches(b));
      el("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: dim ? "dim" : "" }, edgeLayer);
    }
    const degree = new Map();
    for (const [a, b] of state.links) { degree.set(a.id, (degree.get(a.id) || 0) + 1); degree.set(b.id, (degree.get(b.id) || 0) + 1); }
    for (const n of state.nodes) {
      if (!shown.has(n.id)) continue;
      const r = 5 + Math.min(6, degree.get(n.id) || 0);
      const g = el("g", { class: "node" + (matches(n) ? "" : " dim"), transform: `translate(${n.x},${n.y})`, tabindex: 0 }, root);
      if (RING[n.mastery]) el("circle", { r: r + 4, fill: "none", stroke: RING[n.mastery], "stroke-width": 3, "stroke-dasharray": n.mastery === "attempted" ? "3 2" : "" }, g);
      el("circle", { r, fill: `var(--${bucketOf(n)})`, stroke: state.selected === n ? "var(--text)" : "var(--bg)", "stroke-width": state.selected === n ? 2.5 : 1.5 }, g);
      if (shown.size <= 60 || state.view.k > 1.3 || state.selected === n || (state.query && matches(n))) el("text", { x: r + 6, y: 4 }, g).textContent = n.title;
      const title = el("title", {}, g); title.textContent = `${n.title}\n${n.id}`;
      g.addEventListener("click", ev => { ev.stopPropagation(); select(n); });
      g.addEventListener("keydown", ev => { if (ev.key === "Enter") select(n); });
    }
    $("status").textContent = `${shown.size} of ${state.nodes.length} notes shown · scroll to zoom, drag to pan`;
  }

  function select(n) {
    state.selected = n;
    const d = $("detail");
    d.textContent = "";
    if (!n) { const p = document.createElement("p"); p.className = "empty"; p.textContent = "Select a note to see its PARA location and sparring state."; d.appendChild(p); render(); return; }
    const h = document.createElement("h2"); h.textContent = n.title; h.style.textTransform = "none"; h.style.fontSize = "15px"; h.style.color = "var(--text)";
    const dl = document.createElement("dl");
    const label = (list, key) => (list.find(([k]) => k === key) || [key, key])[1];
    const rows = [["Path", n.id], ["Bucket", label(BUCKETS, bucketOf(n))], ["Container", n.container || "—"], ["Mastery", label(MASTERY, n.mastery)], ["Next review", n.nextReview || "—"],
      ["Links", String(state.links.filter(([a, b]) => a === n || b === n).length)]];
    for (const [k, v] of rows) { const dt = document.createElement("dt"); dt.textContent = k; const dd = document.createElement("dd"); dd.textContent = v; dl.append(dt, dd); }
    const open = document.createElement("a");
    open.href = `obsidian://open?vault=${encodeURIComponent(state.graph.vaultName)}&file=${encodeURIComponent(n.id.replace(/\.md$/, ""))}`;
    open.textContent = "Open in Obsidian";
    const p = document.createElement("p"); p.appendChild(open);
    d.append(h, dl, p);
    render();
  }

  function filters() {
    const counts = (key, of) => state.nodes.filter(n => of(n) === key).length;
    const build = (host, list, set, of, mark) => {
      host.textContent = "";
      for (const [key, name] of list) {
        const l = document.createElement("label");
        const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !set.has(key);
        cb.addEventListener("change", () => { cb.checked ? set.delete(key) : set.add(key); render(); });
        const c = document.createElement("span"); c.className = "count"; c.textContent = counts(key, of);
        l.append(cb, mark(key), document.createTextNode(name), c);
        host.appendChild(l);
      }
    };
    build($("buckets"), BUCKETS, state.hidden, bucketOf, key => { const s = document.createElement("span"); s.className = "swatch"; s.style.background = `var(--${key})`; return s; });
    build($("mastery"), MASTERY, state.hiddenMastery, n => n.mastery, key => {
      const s = document.createElement("span"); s.className = "ring";
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
    state.edges = graph.edges;
    const box = svg.getBoundingClientRect();
    state.links = layout(state.nodes, state.edges, box.width || 900, box.height || 700);
    state.view = { x: 0, y: 0, k: 1 };
    state.selected = null;
    $("title").textContent = `${graph.vaultName} — vault graph`;
    const by = m => state.nodes.filter(n => n.mastery === m).length;
    const resources = state.nodes.filter(n => n.bucket === "resources").length;
    $("stats").textContent = `${state.nodes.length} notes · ${state.edges.length} links · ${resources} in Resources · ${by("tier2_passed")} Tier 2 passed · ${by("tier1_passed")} Tier 1 passed · ${by("attempted")} attempted`;
    filters();
    select(null);
  }

  let drag = null;
  svg.addEventListener("pointerdown", ev => { drag = { x: ev.clientX, y: ev.clientY, vx: state.view.x, vy: state.view.y }; svg.classList.add("dragging"); });
  window.addEventListener("pointermove", ev => { if (!drag) return; state.view.x = drag.vx + ev.clientX - drag.x; state.view.y = drag.vy + ev.clientY - drag.y; render(); });
  window.addEventListener("pointerup", () => { drag = null; svg.classList.remove("dragging"); });
  svg.addEventListener("wheel", ev => {
    ev.preventDefault();
    const box = svg.getBoundingClientRect(), mx = ev.clientX - box.left, my = ev.clientY - box.top;
    const k = Math.max(0.2, Math.min(5, state.view.k * (ev.deltaY < 0 ? 1.15 : 1 / 1.15)));
    state.view.x = mx - ((mx - state.view.x) * k) / state.view.k; state.view.y = my - ((my - state.view.y) * k) / state.view.k; state.view.k = k;
    render();
  }, { passive: false });
  svg.addEventListener("click", () => select(null));
  $("search").addEventListener("input", ev => { state.query = ev.target.value.trim().toLowerCase(); render(); });
  $("refresh").addEventListener("click", load);
  load();
})();
