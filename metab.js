/* Shared engine for the Chapter 5 metabolism modules.
   A page calls Metab.start({title, page, BL, MORE, STEPS, next}) and the engine builds the
   header, animated stage, step bubble (Learn/Test blanks), hands-on activities, and navigation. */
(function(){
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const f1 = v => (+v).toFixed(1), f3 = v => (+v).toFixed(3);

  /* ================= Drawing kit ================= */
  const C = {carbon:"#4a5263", P:"#e8744f", O:"#d9443a", N:"#3b7dd8", e:"#f2b134", H:"#3b7dd8", atp:"#8e5bd0", atpText:"#5b3fb0", nad:"#2f9e63", nadText:"#1b7f4e", fadText:"#8a5a00", water:"#2f7fbf", fad:"#c98a0e", enz:"#6c7ae0", teal:"#0f766e", green:"#2f9e63", blue:"#3f4cc0", red:"#d9443a", purple:"#8e5bd0", gold:"#f2b134", orange:"#e8744f"};
  const A = {
    clamp, lerp, smooth, seg, f1, f3, C,
    op: (o, s) => o >= .999 ? s : o <= .001 ? "" : `<g opacity="${f3(o)}">${s}</g>`,
    tx: (x, y, s, cls, extra) => `<text x="${f1(x)}" y="${f1(y)}" class="${cls || "t12 mid"}"${extra ? " " + extra : ""}>${s}</text>`,
    pill(x, y, s, fill, o, fs){ fs = fs || 14; const w = s.length * fs * .58 + 24; return A.op(o === undefined ? 1 : o, `<rect x="${f1(x - w / 2)}" y="${f1(y - fs)}" width="${f1(w)}" height="${f1(fs * 1.9)}" rx="${f1(fs * .95)}" fill="${fill}"/><text x="${f1(x)}" y="${f1(y + fs * .36)}" font-size="${fs}" font-weight="700" fill="#fff" text-anchor="middle">${s}</text>`); },
    arrow(x1, y1, x2, y2, col, w, dash){ const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<path d="M${f1(x1)},${f1(y1)} L${f1(x2)},${f1(y2)}" stroke="${col || "#5a6376"}" stroke-width="${w || 3}" fill="none"${dash ? ` stroke-dasharray="${dash}"` : ""}/><path d="M${f1(x2)},${f1(y2)} L${f1(x2 - h * Math.cos(a - .45))},${f1(y2 - h * Math.sin(a - .45))} L${f1(x2 - h * Math.cos(a + .45))},${f1(y2 - h * Math.sin(a + .45))} Z" fill="${col || "#5a6376"}"/>`; },
    /* carbon backbone: n beads in a row (or ring), optional phosphate tags */
    carbons(x, y, n, o){ o = o || {}; const r = o.r || 11, gap = o.gap || 25, col = o.col || C.carbon; let s = "";
      const pts = o.ring ? Array.from({length:n}, (_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [x + (r * 2.3) * Math.cos(a), y + (r * 2.3) * Math.sin(a)]; })
        : Array.from({length:n}, (_, i) => [x + (i - (n - 1) / 2) * gap, y]);
      for (let i = 0; i < n; i++){ const j = o.ring ? (i + 1) % n : i + 1; if (j < n || o.ring) s += `<line x1="${f1(pts[i][0])}" y1="${f1(pts[i][1])}" x2="${f1(pts[j % n][0])}" y2="${f1(pts[j % n][1])}" stroke="${col}" stroke-width="4"/>`; }
      pts.forEach(p => { s += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${r}" fill="${col}"/><text x="${f1(p[0])}" y="${f1(p[1] + 4.5)}" font-size="${r > 9 ? 12 : 10}" font-weight="700" fill="#fff" text-anchor="middle">C</text>`; });
      (o.P || []).forEach(k => { const p = pts[k === "end" ? n - 1 : k], dx = k === 0 ? -1 : 1; s += A.phos(p[0] + dx * (r + 14), p[1] - (o.ring ? 0 : 20)); });
      return s; },
    phos: (x, y, rr) => { rr = rr || 11; return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${rr}" fill="${C.P}" stroke="#fff" stroke-width="2"/><text x="${f1(x)}" y="${f1(y + 4.5)}" font-size="12" font-weight="700" fill="#fff" text-anchor="middle">P</text>`; },
    /* ATP / ADP: adenosine block + phosphates */
    /* ATP / ADP: the adenosine block (A) with its chain of phosphates. Text sizes are divided by the scale,
       so a scaled-down token still has readable labels. */
    atp(x, y, n, o){ o = o || {}; const sc = o.sc || 1, fs = v => f1(v / sc); let s = `<g transform="translate(${f1(x)},${f1(y)}) scale(${sc})"><rect x="-34" y="-14" width="36" height="28" rx="8" fill="${C.atp}"/><text x="-16" y="${f1(5 * Math.min(1, 1 / sc))}" font-size="${fs(Math.min(13, 13 * sc + 2))}" font-weight="700" fill="#fff" text-anchor="middle">A</text>`;
      for (let i = 0; i < n; i++) s += `<line x1="${2 + i * 22}" y1="0" x2="${14 + i * 22}" y2="0" stroke="#b25a36" stroke-width="3"/>` + A.phos(14 + i * 22, 0, 10);
      if (o.label !== false) s += `<text x="${f1((n * 22 - 22) / 2)}" y="${o.below ? f1(16 + 15 / sc) : f1(-15 - 5 / sc)}" font-size="${fs(13)}" font-weight="700" fill="${C.atpText}" text-anchor="middle">${n === 3 ? "ATP" : n === 2 ? "ADP" : "AMP"}</text>`;
      return s + `</g>`; },
    /* electron carriers */
    carrier(x, y, name, full, o){ o = o || {}; const col = name.indexOf("FAD") === 0 ? C.fad : name.indexOf("NADP") === 0 ? "#0f766e" : C.nad;
      const lab = full ? (name === "FAD" ? "FADH₂" : name + "H") : (name === "FAD" ? "FAD" : name + "⁺");
      const w = lab.length * 9 + 22;
      let s = `<rect x="${f1(x - w / 2)}" y="${f1(y - 14)}" width="${f1(w)}" height="28" rx="14" fill="${full ? col : "#fff"}" stroke="${col}" stroke-width="2.5"/><text x="${f1(x)}" y="${f1(y + 5)}" font-size="14" font-weight="700" fill="${full ? "#fff" : col}" text-anchor="middle">${lab}</text>`;
      if (full && o.e !== false) s += A.eDot(x + w / 2 - 2, y - 13, 6) + A.eDot(x + w / 2 + 9, y - 6, 6);
      return s; },
    eDot: (x, y, r) => { r = r || 9; return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${C.e}" stroke="#a8760f" stroke-width="1.5"/>` + (r > 7 ? `<text x="${f1(x)}" y="${f1(y + 4)}" font-size="${r > 8 ? 11 : 9}" font-weight="700" fill="#3b2a00" text-anchor="middle">e⁻</text>` : ""); },
    hion: (x, y, r) => { r = r || 13; return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="#dbe7fb" stroke="${C.H}" stroke-width="2"/><text x="${f1(x)}" y="${f1(y + r * .34)}" font-size="${r >= 12 ? 12 : 10}" font-weight="700" fill="#1f4a9c" text-anchor="middle">H⁺</text>`; },
    co2: (x, y, o) => A.op(o === undefined ? 1 : o, `<circle cx="${f1(x - 17)}" cy="${f1(y)}" r="8" fill="${C.O}"/><circle cx="${f1(x + 17)}" cy="${f1(y)}" r="8" fill="${C.O}"/><line x1="${f1(x - 10)}" y1="${f1(y)}" x2="${f1(x + 10)}" y2="${f1(y)}" stroke="#343b4a" stroke-width="3"/><circle cx="${f1(x)}" cy="${f1(y)}" r="10" fill="${C.carbon}"/><text x="${f1(x)}" y="${f1(y + 4)}" font-size="10" font-weight="700" fill="#fff" text-anchor="middle">C</text>`),
    o2: (x, y, r) => { r = r || 12; const d = r * .78; return `<circle cx="${f1(x - d)}" cy="${f1(y)}" r="${r}" fill="${C.O}" stroke="#fff" stroke-width="2"/><circle cx="${f1(x + d)}" cy="${f1(y)}" r="${r}" fill="${C.O}" stroke="#fff" stroke-width="2"/><text x="${f1(x)}" y="${f1(y + r * .36)}" font-size="${r >= 11 ? 12 : 10}" font-weight="700" fill="#fff" text-anchor="middle">O₂</text>`; },
    /* inorganic final electron acceptors and what they become (anaerobic respiration) */
    ion: (x, y, lab, fill, txt, r) => { r = r || 18; return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${fill}" stroke="#fff" stroke-width="2"/><text x="${f1(x)}" y="${f1(y + 4)}" font-size="${r >= 17 ? 12 : 11}" font-weight="700" fill="${txt || "#fff"}" text-anchor="middle">${lab}</text>`; },
    no3: (x, y, r) => A.ion(x, y, "NO₃⁻", "#8e5bd0", "#fff", r || 19),
    no2: (x, y, r) => A.ion(x, y, "NO₂⁻", "#d9c7f3", "#3b1f66", r || 17),
    so4: (x, y, r) => A.ion(x, y, "SO₄²⁻", "#c98a0e", "#fff", r || 19),
    h2s: (x, y, r) => A.ion(x, y, "H₂S", "#f1e3a6", "#6b5200", r || 17),
    h2o: (x, y) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="10" fill="${C.O}"/><circle cx="${f1(x - 11)}" cy="${f1(y + 7)}" r="6" fill="#9fc2f0"/><circle cx="${f1(x + 11)}" cy="${f1(y + 7)}" r="6" fill="#9fc2f0"/>`,
    /* enzyme: blob with a notch (active site) of a given shape */
    enzyme(x, y, o){ o = o || {}; const col = o.col || C.enz, sc = o.sc || 1, open = o.open === undefined ? 1 : o.open;
      const notch = o.notch === "tri" ? `L${-16 * open},-46 L0,${-46 + 26 * open} L${16 * open},-46` : `L-18,-46 C-18,${-46 + 30 * open} 18,${-46 + 30 * open} 18,-46`;
      return `<g transform="translate(${f1(x)},${f1(y)}) scale(${sc})"><path d="M-60,-46 ${notch} L60,-46 C84,-46 88,-20 88,4 C88,40 60,54 0,54 C-60,54 -88,40 -88,4 C-88,-20 -84,-46 -60,-46 Z" fill="${col}" stroke="#3e4aa8" stroke-width="2.5"/>${o.label ? `<text x="0" y="16" font-size="15" font-weight="700" fill="#fff" text-anchor="middle">${o.label}</text>` : ""}${o.allo ? `<rect x="66" y="10" width="26" height="26" rx="6" fill="#fff" stroke="#3e4aa8" stroke-width="2" stroke-dasharray="4 3"/>` : ""}</g>`; },
    membrane(x1, x2, y, h){ h = h || 44; let s = `<rect x="${x1}" y="${f1(y - h / 2)}" width="${x2 - x1}" height="${h}" fill="#f6e7c4"/>`; for (let x = x1 + 7; x < x2; x += 14){ s += `<circle cx="${x}" cy="${f1(y - h / 2 + 6)}" r="6" fill="#e6b85c"/><circle cx="${x}" cy="${f1(y + h / 2 - 6)}" r="6" fill="#e6b85c"/>`; } return s; },
    glucoseRing: (x, y, o) => A.carbons(x, y, 6, {ring:true, ...(o || {})}),
    /* draggable answer chips: the same look on every page. state: "" | "pick" | "ok" */
    chipW: s => s.replace(/<[^>]+>/g, "").length * 8.2 + 30,
    chip(x, y, s, state){ const w = A.chipW(s), st = state || "";
      const fill = st === "pick" ? "#fff6d6" : st === "ok" ? "#e1f3e8" : "#fff", stroke = st === "pick" ? C.gold : st === "ok" ? "#1b7f4e" : "#5a6376", txt = st === "ok" ? "#1b7f4e" : "#343b4a";
      return (st ? "" : `<rect x="${f1(x - w / 2)}" y="${f1(y - 14)}" width="${f1(w)}" height="34" rx="17" fill="#1d2433" opacity=".14"/>`) + `<rect x="${f1(x - w / 2)}" y="${f1(y - 17)}" width="${f1(w)}" height="34" rx="17" fill="${fill}" stroke="${stroke}" stroke-width="${st === "pick" ? 4 : 2.5}"/><text x="${f1(x)}" y="${f1(y + 5)}" font-size="14" font-weight="700" fill="${txt}" text-anchor="middle">${s}</text>`; },
    /* centered rows of chips ([id, label] pairs), wrapping past maxW. Returns {id: [x, y]} */
    chipRows(list, cx, y, maxW, gap){
      const rows = [[]]; let w = 0;
      list.forEach(c => { const cw = A.chipW(c[1]); if (w + cw > maxW && rows[rows.length - 1].length){ rows.push([]); w = 0; } rows[rows.length - 1].push(c); w += cw + 12; });
      const out = {};
      rows.forEach((r, ri) => { let x = cx - (r.reduce((q, c) => q + A.chipW(c[1]), 0) + 12 * (r.length - 1)) / 2; r.forEach(c => { const cw = A.chipW(c[1]); out[c[0]] = [x + cw / 2, y + ri * (gap || 42)]; x += cw + 12; }); });
      return out; },
    /* a drop target on the diagram. state: "" (idle) | "ready" (something is picked up) | "over" (being hovered) */
    zone(x, y, w, h, state, rx){ const s = state || "", r = rx === undefined ? 12 : rx;
      return `<rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="${r}" fill="${s === "over" ? "#dfe3fb" : s === "ready" ? "#eef0fd" : "rgba(255,255,255,.75)"}" stroke="${s ? "#3f4cc0" : "#8a93a3"}" stroke-width="${s === "over" ? 3.5 : 2.5}"${s === "over" ? "" : ` stroke-dasharray="7 5"`}/>`; }
  };

  /* ================= Drag helper (mouse, touch, pen; tap also works) ================= */
  function dragify(el, o){
    const nope = () => { el.classList.remove("nope"); void el.offsetWidth; el.classList.add("nope"); };
    el.setAttribute("tabindex", "0"); el.setAttribute("role", "button");
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); if (o.tap && o.tap() === false) nope(); } });
    el.addEventListener("pointerdown", e => {
      if (e.button > 0) return;
      e.preventDefault();
      const r = el.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
      let moved = false, clone = null, over = null;
      const zones = () => (o.targets ? o.targets() : [...document.querySelectorAll("[data-zone]")]);
      const hit = ev => zones().find(z => { const q = z.getBoundingClientRect(); return ev.clientX > q.left && ev.clientX < q.right && ev.clientY > q.top && ev.clientY < q.bottom; }) || null;
      const move = ev => {
        if (!moved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 6){ moved = true; clone = el.cloneNode(true); clone.classList.add("dragging"); clone.style.width = r.width + "px"; document.body.appendChild(clone); el.classList.add("lifted"); }
        if (!clone) return;
        clone.style.left = (ev.clientX - dx) + "px"; clone.style.top = (ev.clientY - dy) + "px";
        over = hit(ev); zones().forEach(z => z.classList.toggle("over", z === over));
      };
      const up = () => {
        document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); document.removeEventListener("pointercancel", up);
        if (clone) clone.remove(); el.classList.remove("lifted"); zones().forEach(z => z.classList.remove("over"));
        if (!moved){ if (o.tap && o.tap() === false) nope(); return; }
        if (over && o.drop(over) === false) nope();
      };
      document.addEventListener("pointermove", move); document.addEventListener("pointerup", up); document.addEventListener("pointercancel", up);
    });
  }

  /* A reusable "sort the cards into bins" activity */
  function sortGate(spec){
    return {
      title:spec.title, done:spec.done,
      init:() => ({placed:{}}),
      html:st => `<div class="row" data-tray="1">${spec.cards.filter(c => !st.placed[c[0]]).map(c => `<span class="tok" data-card="${c[0]}">${c[1]}</span>`).join("") || `<span class="lbl">All sorted!</span>`}</div>
        <div class="zones">${spec.bins.map(b => `<div class="zone" data-zone="${b[0]}"><span class="zl">${b[1]}</span><div class="zin">${spec.cards.filter(c => st.placed[c[0]] === b[0]).map(c => `<span class="tok placed">${c[1]}</span>`).join("")}</div></div>`).join("")}</div>`,
      wire:(g, st, api) => {
        g.querySelectorAll("[data-card]").forEach(el => {
          const card = spec.cards.find(c => c[0] === el.dataset.card);
          const put = bin => {
            if (bin !== card[2]){ api.msg(card[3] ? card[3] : "Not quite. Think about it again!", "bad"); return false; }
            st.placed[card[0]] = bin; api.redraw();
            const left = spec.cards.filter(c => !st.placed[c[0]]).length;
            if (!left){ api.msg(spec.finish || "All sorted!", "good"); setTimeout(api.pass, 900); }
            else api.msg(card[4] || "Yes! " + left + " to go.", "good");
            return true;
          };
          dragify(el, {drop:z => put(z.dataset.zone), tap:() => { st.pick = card[0]; g.querySelectorAll("[data-card]").forEach(q => q.style.outline = q === el ? "3px solid #f2b134" : ""); api.msg("Now tap the box it belongs in.", ""); }});
        });
        g.querySelectorAll("[data-zone]").forEach(z => z.addEventListener("click", () => {
          if (!st.pick) return; const card = spec.cards.find(c => c[0] === st.pick); st.pick = null;
          if (z.dataset.zone !== card[2]){ api.msg(card[3] || "Not quite. Think about it again!", "bad"); api.redraw(); return; }
          st.placed[card[0]] = z.dataset.zone; api.redraw();
          const left = spec.cards.filter(c => !st.placed[c[0]]).length;
          if (!left){ api.msg(spec.finish || "All sorted!", "good"); setTimeout(api.pass, 900); } else api.msg(card[4] || "Yes! " + left + " to go.", "good");
        }));
        if (!g.querySelector("#gateMsg").textContent) api.msg(spec.tip || "Drag each card into the right box (or tap a card, then tap a box).", "");
      }
    };
  }

  /* ================= Engine ================= */
  function start(cfg){
    const BL = window.__BL = cfg.BL || {}, MORE = cfg.MORE || {}, STEPS = cfg.STEPS, LAST = STEPS.length - 1;
    const PAGE = location.pathname.split("/").pop() || cfg.page;
    document.title = cfg.title;
    (document.getElementById("app") || document.body).innerHTML = `<div class="wrap">
      <header><div><a class="backlink" href="index.html">All modules</a><h1>${cfg.title}<span class="chap">Chapter 5</span></h1></div>
        <div class="controls"><div class="seg" role="group" aria-label="Mode"><button id="learnBtn" aria-pressed="true">Learn</button><button id="testBtn" aria-pressed="false">Test</button></div><button class="ghost" id="restartBtn">Restart</button></div></header>
      <p class="modehint" id="modeHint"></p>
      <div class="stage"><svg id="scene" viewBox="0 0 1000 470" role="img" aria-label="${cfg.title} diagram"></svg><div class="stagelay" id="stageLay"></div></div>
      <div class="tablewrap" id="tableWrap" hidden></div>
      <section class="bubble" id="bubble" aria-live="polite">
        <div class="stepno" id="stepNo"></div><div class="title" id="stepTitle"></div>
        <p class="text" id="stepText"></p><p class="after" id="stepAfter" hidden></p>
        <div class="gate" id="gate" hidden></div>
        <div class="feedback" id="feedback"></div>
        <div class="check-row" id="checkRow" hidden><button class="btn primary" id="checkBtn">Check</button><button class="btn hint" id="hintBtn">Hint</button><button class="btn secondary" id="moveOnBtn">Move on</button></div>
        <div class="bubble-foot" id="bubbleFoot"></div>
      </section>
      <div class="bridge" id="bridge" hidden></div>
      <nav class="stepnav"><div class="navbtns"><button class="btn secondary" id="backBtn">Back</button><button class="btn secondary" id="replayBtn">Replay</button></div><div class="dots" id="dots"></div><div class="navbtns"><button class="btn primary" id="nextBtn">Next</button></div></nav>
    </div>
    <div class="overlay" id="moreOverlay" hidden><div class="panel" role="dialog" aria-modal="true" aria-labelledby="moreTitle"><span class="ptag">Learn more</span><h2 id="moreTitle"></h2><div id="moreBody"></div><button class="btn primary close" id="moreClose">Back to the module</button></div></div>`;

    const $ = id => document.getElementById(id);
    const svg = $("scene"), textEl = $("stepText"), afterEl = $("stepAfter"), fb = $("feedback"), checkRow = $("checkRow"), nextBtn = $("nextBtn"), backBtn = $("backBtn"), bubble = $("bubble");
    let mode = "learn", idx = 0, furthest = 0, bl = {}, sceneT = 0, frozen = false;
    const gates = {}, gstate = {};
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resolved = id => mode === "learn" || !!bl[id];
    const blanksOf = st => (st.text.match(/\{\{(\w+)\}\}/g) || []).map(m => m.slice(2, -2));
    const gateDone = i => !STEPS[i].gate || !!gates[i];
    const stepResolved = i => (mode === "learn" || blanksOf(STEPS[i]).every(id => bl[id])) && gateDone(i);
    const R = id => resolved(id) ? BL[id].show : "?";
    const gs = i => { if (!STEPS[i].gate) return {}; if (!gstate[i]) gstate[i] = STEPS[i].gate.init ? STEPS[i].gate.init() : {}; return gstate[i]; };

    /* ---- scene ---- */
    function render(){ const st = STEPS[idx], vh = st.vh || 470; if (svg.dataset.vh !== String(vh)){ svg.setAttribute("viewBox", `0 0 1000 ${vh}`); svg.dataset.vh = vh; } svg.innerHTML = st.scene ? st.scene(frozen && !st.live ? 0 : sceneT, {R, resolved, g:gs(idx), done:gateDone(idx), A}) : ""; }
    let last = performance.now();
    function frame(now){ const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; if (!frozen || STEPS[idx].live) sceneT += reduced ? dt * .5 : dt; render(); requestAnimationFrame(frame); }

    /* ---- answers ---- */
    function lev(a, b){ const m = a.length, n = b.length, d = []; for (let i = 0; i <= m; i++) d[i] = [i]; for (let j = 0; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)); return d[m][n]; }
    const norm = s => s.toLowerCase().replace(/₂/g, "2").replace(/[^a-z0-9]/g, "");
    function matches(id, val){ const b = BL[id], v = norm(val); if (!v) return false; return b.ans.some(a => a === v || (b.fuzzy && a.length >= 5 && lev(v, a) <= 1)); }
    const termHTML = (id, cls) => `<strong class="term ${cls || ""}">${BL[id].show}</strong>`;
    function termEl(id, cls){ const s = document.createElement("strong"); s.className = "term " + cls; s.innerHTML = BL[id].show; return s; }
    function blankHTML(id){
      if (mode === "learn") return termHTML(id);
      if (bl[id]) return termHTML(id, bl[id]);
      return `<input class="blank" data-id="${id}" size="${Math.max(3, BL[id].show.replace(/<[^>]+>/g, "").length + 1)}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Fill in the blank">`;
    }

    /* ---- activities ---- */
    function gateMsg(t, cls){ const m = $("gateMsg"); if (m){ m.className = "gmsg " + (cls || ""); m.innerHTML = t; } }
    function renderGate(){
      const g = $("gate"), st = STEPS[idx], G = st.gate;
      if (!G){ g.hidden = true; g.innerHTML = ""; return; }
      g.hidden = false; g.className = "gate" + (gates[idx] ? " done" : "");
      if (gates[idx] && !G.keep){ g.innerHTML = `<div class="gtitle">✓ ${G.done}</div>`; return; }
      const S = gs(idx), keepMsg = $("gateMsg") ? $("gateMsg").outerHTML : "";
      g.innerHTML = `<div class="gtitle">${gates[idx] ? "✓ " + G.done : G.title}</div>` + G.html(S) + `<div class="gmsg" id="gateMsg"></div>`;
      if (keepMsg && g.dataset.step === String(idx)) $("gateMsg").outerHTML = keepMsg;
      g.dataset.step = idx;
      const i0 = idx;
      G.wire(g, S, {pass:() => { if (idx !== i0) return; gates[i0] = true; renderGate(); if (stepResolved(idx)) resolvedNow(); else updateButtons(); },
        msg:gateMsg, redraw:() => { if (idx === i0) renderGate(); }, A, dragify, svg});
    }

    /* ---- UI ---- */
    function openMore(k){ const m = MORE[k]; $("moreTitle").textContent = m.title; $("moreBody").innerHTML = m.html; $("moreOverlay").hidden = false; $("moreClose").focus(); }
    const closeMore = () => { $("moreOverlay").hidden = true; };
    function footer(){
      const st = STEPS[idx];
      let h = (st.links || []).map(l => `<a class="btn secondary sm" href="${l[1]}">${l[0]}</a>`).join("");
      if (st.more) h += `<button class="more-btn" data-more="${st.more}">Learn more</button>`;
      $("bubbleFoot").innerHTML = h;
      $("bubbleFoot").querySelectorAll("[data-more]").forEach(b => b.addEventListener("click", () => openMore(b.dataset.more)));
    }
    function renderTable(){
      const st = STEPS[idx], wrap = $("tableWrap"), D = st.table && stepResolved(idx) ? st.table : null;
      if (!D){ wrap.hidden = true; return; }
      wrap.innerHTML = `<div class="cap">${D.cap}</div><table><thead><tr>${D.head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>` + D.rows.map(r => `<tr>${r.map((c, j) => j ? `<td>${c}</td>` : `<td><b>${c}</b></td>`).join("")}</tr>`).join("") + `</tbody></table>`;
      wrap.hidden = false;
    }
    function showAfter(){ const st = STEPS[idx]; if (st.after && stepResolved(idx)){ afterEl.innerHTML = st.after; afterEl.hidden = false; } else afterEl.hidden = true; }
    function updateButtons(){
      const open = mode === "test" && !!textEl.querySelector("input.blank");
      checkRow.hidden = !open; nextBtn.disabled = open || !gateDone(idx); backBtn.disabled = idx === 0;
      nextBtn.textContent = idx === LAST ? "Start over" : "Next";
      const b = $("bridge"); b.hidden = !(idx === LAST && stepResolved(idx) && cfg.next && cfg.next.length);
    }
    function renderBubble(){
      const st = STEPS[idx];
      $("stepNo").textContent = `${st.part} (step ${idx + 1} of ${STEPS.length})`;
      $("stepTitle").textContent = st.title;
      textEl.innerHTML = st.text.replace(/\{\{(\w+)\}\}/g, (m, id) => blankHTML(id));
      textEl.querySelectorAll("input.blank").forEach(inp => {
        inp.addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); check(); } });
        inp.addEventListener("input", () => inp.classList.remove("wrong"));
      });
      fb.textContent = ""; fb.className = "feedback";
      showAfter(); footer(); updateButtons();
      bubble.classList.remove("pop"); void bubble.offsetWidth; bubble.classList.add("pop");
      const first = textEl.querySelector("input.blank"); if (first && mode === "test") first.focus({preventScroll:true});
    }
    function renderNav(){
      const dots = $("dots"); dots.innerHTML = "";
      STEPS.forEach((st, i) => {
        if (i > 0 && STEPS[i - 1].part !== st.part){ const g = document.createElement("span"); g.className = "gap"; dots.appendChild(g); }
        const b = document.createElement("button");
        b.className = "dot" + (i === idx ? " current" : (i < furthest || i < idx ? " seen" : ""));
        b.textContent = i + 1; b.title = `${st.part}: ${st.title}`; b.setAttribute("aria-label", `Go to step ${i + 1}: ${st.title}`);
        b.disabled = mode === "test" && i > furthest;
        b.addEventListener("click", () => goTo(i));
        dots.appendChild(b);
      });
    }
    function enterStep(i, force){
      const changed = i !== idx || force; idx = i;
      const res = stepResolved(i);
      if (res) furthest = Math.max(furthest, i + 1);
      if (changed) sceneT = 0;
      frozen = !res;
      $("gate").dataset.step = "";
      /* per-step extras: interactive SVG handlers are cleared, and an optional HTML overlay sits on the stage */
      svg.onpointerdown = svg.onpointermove = svg.onpointerup = svg.onpointercancel = null; svg.style.cursor = ""; svg.style.touchAction = "";
      $("stageLay").innerHTML = STEPS[i].stageHTML || "";
      renderBubble(); renderNav(); renderTable(); renderGate(); render();
    }
    const goTo = i => enterStep(clamp(i, 0, LAST));
    function resolvedNow(){
      if (!stepResolved(idx)){ updateButtons(); renderNav(); return; }
      furthest = Math.max(furthest, idx + 1);
      updateButtons(); renderNav(); showAfter(); renderTable();
      if (frozen){ sceneT = 0; frozen = false; }
      nextBtn.focus({preventScroll:true});
      completion();
    }
    function check(){
      const inputs = [...textEl.querySelectorAll("input.blank")];
      let wrong = 0, empty = 0;
      inputs.forEach(inp => {
        const id = inp.dataset.id;
        if (!inp.value.trim()){ empty++; wrong++; return; }
        if (matches(id, inp.value)){ bl[id] = "correct"; inp.replaceWith(termEl(id, "correct")); }
        else { wrong++; inp.classList.remove("wrong"); void inp.offsetWidth; inp.classList.add("wrong"); }
      });
      if (wrong){
        fb.className = "feedback bad";
        fb.textContent = empty === wrong ? "Type an answer in each blank, or tap Move on to see it." : "Not quite yet. Give it another try, tap Hint, or tap Move on to see the answer.";
        const n = textEl.querySelector("input.wrong") || textEl.querySelector("input.blank"); if (n) n.focus({preventScroll:true});
        updateButtons();
      } else {
        fb.className = "feedback good"; fb.textContent = ["Correct!", "Nailed it!", "Yes! Great job.", "Exactly right!", "You've got it!"][idx % 5];
        resolvedNow();
      }
    }
    function moveOn(){
      textEl.querySelectorAll("input.blank").forEach(inp => { const id = inp.dataset.id; bl[id] = "revealed"; inp.replaceWith(termEl(id, "revealed")); });
      fb.className = "feedback warn"; fb.textContent = "Here's the answer. Read it over, then tap Next when you're ready.";
      resolvedNow();
    }
    function hint(){
      const ins = [...textEl.querySelectorAll("input.blank")];
      ins.forEach(inp => {
        const w = BL[inp.dataset.id].show.replace(/<[^>]+>/g, ""), lvl = Math.min((+inp.dataset.hint || 0) + 1, Math.max(1, Math.ceil(w.length / 2)));
        inp.dataset.hint = lvl; if (inp.classList.contains("wrong")) inp.value = "";
        inp.placeholder = w.slice(0, lvl) + w.slice(lvl).replace(/[^\s-]/g, "_"); inp.size = Math.max(inp.size || 3, w.length + 1);
      });
      if (ins.length){ fb.className = "feedback warn"; fb.textContent = "Hint: the first letters are shown, and each dash is one letter. Tap Hint again for more."; ins[0].focus({preventScroll:true}); }
    }
    function setMode(m){
      mode = m; document.body.classList.toggle("testing", m === "test");
      $("learnBtn").setAttribute("aria-pressed", m === "learn"); $("testBtn").setAttribute("aria-pressed", m === "test");
      $("modeHint").textContent = m === "learn" ? "" : "Test mode: type the missing term to keep going. Stuck? Tap Hint or Move on.";
      enterStep(idx, true);
    }
    function restart(){ bl = {}; furthest = 0; for (const k in gates) delete gates[k]; for (const k in gstate) delete gstate[k]; enterStep(0, true); }
    let toasted = false;
    function completion(){
      if (idx !== LAST || mode !== "test" || !stepResolved(idx)) return;
      let was = false; try { was = localStorage.getItem("bio112-done:" + PAGE) === "1"; localStorage.setItem("bio112-done:" + PAGE, "1"); } catch (e) {}
      if (!toasted && !was){ toasted = true; const t = document.createElement("div"); t.className = "donetoast"; t.setAttribute("role", "status"); t.textContent = "Module complete! It now has a checkmark on the home page."; document.body.appendChild(t); setTimeout(() => t.remove(), 3600); }
    }
    if (cfg.next) $("bridge").innerHTML = `<b>${cfg.nextLabel || "Where to next?"}</b><div class="links">${cfg.next.map((l, i) => `<a class="btn ${i ? "secondary" : "primary"}" href="${l[1]}">${l[0]}</a>`).join("")}</div>`;

    $("learnBtn").addEventListener("click", () => setMode("learn"));
    $("testBtn").addEventListener("click", () => setMode("test"));
    $("restartBtn").addEventListener("click", restart);
    $("checkBtn").addEventListener("click", check);
    $("moveOnBtn").addEventListener("click", moveOn);
    $("hintBtn").addEventListener("click", hint);
    backBtn.addEventListener("click", () => goTo(idx - 1));
    $("replayBtn").addEventListener("click", () => { sceneT = 0; });
    nextBtn.addEventListener("click", () => { if (idx === LAST) restart(); else goTo(idx + 1); });
    $("moreClose").addEventListener("click", closeMore);
    $("moreOverlay").addEventListener("click", e => { if (e.target.id === "moreOverlay") closeMore(); });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !$("moreOverlay").hidden){ closeMore(); return; }
      if (!$("moreOverlay").hidden || (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName))) return;
      if (e.key === "ArrowRight" && !nextBtn.disabled && idx < LAST) goTo(idx + 1);
      if (e.key === "ArrowLeft" && idx > 0) goTo(idx - 1);
    });
    setMode("learn");
    const hs = /^#step-(\d+)$/.exec(location.hash || "");
    if (hs) goTo(+hs[1] - 1);
    requestAnimationFrame(frame);
    window.__m = {goTo, check, moveOn, setMode, get idx(){ return idx; }, STEPS, gates, gstate, pass:() => { gates[idx] = true; renderGate(); resolvedNow(); }};
  }

  /* on-diagram dragging: anything marked data-drag can be dragged; tapping it picks it, then tapping a spot drops it there */
  function svgDrag(api, st, o){
    const svg = api.svg; svg.style.touchAction = "none";
    const toSVG = e => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
    svg.onpointerdown = e => {
      const d = e.target.closest && e.target.closest("[data-drag]");
      if (!d){ if (st.pick){ const k = st.pick; st.pick = null; o.drop(k, toSVG(e)); } return; }
      e.preventDefault(); const p = toSVG(e);
      st.drag = {kind:d.dataset.drag, x:p.x, y:p.y, sx:p.x, sy:p.y, moved:false};
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}
    };
    svg.onpointermove = e => { const d = st.drag; if (!d) return; const p = toSVG(e); d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; };
    svg.onpointerup = svg.onpointercancel = e => {
      const d = st.drag; if (!d) return; st.drag = null;
      if (!d.moved){ st.pick = st.pick === d.kind ? null : d.kind; if (st.pick && o.picked) o.picked(d.kind); return; }
      st.pick = null; o.drop(d.kind, toSVG(e));
    };
  }
  /* Place items onto zones drawn on the diagram.
     o.items() -> [{id, label, x, y}] (what can still be picked up, where it is drawn)
     o.zones() -> [{id, label, x, y, w, h, hit?(p)}] (drop targets, in SVG units)
     o.put(itemId, zoneId) handles the drop (feedback, state); o.miss is the message for a drop on empty space.
     Keyboard: invisible buttons sit over the graphic (they never catch the mouse); Tab to an item, Enter to pick it up,
     then Tab to a spot and Enter to place it. */
  function placeOn(api, st, o){
    const svg = api.svg, lay = document.getElementById("stageLay");
    const vb = () => svg.viewBox.baseVal;
    const inside = (z, p) => z.hit ? z.hit(p) : Math.abs(p.x - z.x) <= z.w / 2 + 6 && Math.abs(p.y - z.y) <= z.h / 2 + 6;
    const zoneAt = p => o.zones().find(z => inside(z, p));
    const drop = (k, zid) => { o.put(k, zid); keys(); };
    svgDrag(api, st, {picked:k => { api.msg(o.pickMsg || "Now tap the spot where it belongs.", ""); keys(); },
      drop:(k, p) => { const z = zoneAt(p); if (!z){ api.msg(o.miss || "Drop it onto one of the dashed spots on the diagram.", ""); keys(); return; } drop(k, z.id); }});
    function btn(x, y, w, h, label, fn){
      const b = document.createElement("button"); const V = vb();
      b.type = "button"; b.className = "kbspot"; b.setAttribute("aria-label", label);
      b.style.cssText = `left:${(x - w / 2 - V.x) / V.width * 100}%;top:${(y - h / 2 - V.y) / V.height * 100}%;width:${w / V.width * 100}%;height:${h / V.height * 100}%`;
      b.addEventListener("click", fn); lay.appendChild(b); return b;
    }
    function keys(focusZone){
      if (!lay) return;
      const had = lay.contains(document.activeElement) && document.activeElement.classList.contains("kbspot");
      lay.querySelectorAll(".kbspot").forEach(b => b.remove());
      let first = null;
      if (st.pick !== undefined && st.pick !== null){
        o.zones().forEach(z => { const b = btn(z.x, z.y, z.w, z.h, `Place it here: ${z.label}`, () => { const k = st.pick; st.pick = null; drop(k, z.id); }); if (!first) first = b; });
      }
      o.items().forEach(it => { const b = btn(it.x, it.y, A.chipW(it.label) + 6, 40, `Pick up ${it.label.replace(/<[^>]+>/g, "")}`, () => { st.pick = it.id; api.msg(o.pickMsg || "Now tab to the spot where it belongs and press Enter.", ""); keys(true); }); if (!first) first = b; });
      if ((had || focusZone) && first) first.focus({preventScroll:true});
    }
    keys();
    return {refresh:keys};
  }
  window.Metab = {start, A, dragify, sortGate, svgDrag, placeOn};
})();
