/* Study path: one guided route through every major module, in order.
   While the path is on, each page shows a banner with the current stop and a button to the next one. */
(function(){
  const STOPS = [
    {page:"dna-replication.html", title:"DNA Replication", area:"DNA Replication"},
    {page:"pretranscriptional-control.html", view:"euk", title:"Gene regulation in eukaryotes", area:"Pre-transcriptional control"},
    {page:"pretranscriptional-control.html", view:["basics","ind","rep"], title:"Operons: lac & trp", area:"Pre-transcriptional control"},
    {page:"transcription.html", title:"Transcription", area:"Transcription"},
    {page:"posttranscriptional-control.html", title:"Post-transcriptional control", area:"Post-transcriptional control"},
    {page:"translation.html", title:"Translation", area:"Translation"},
    {page:"mutations.html", title:"Mutations", area:"Mutations"},
    {page:"enzymes.html", title:"Enzymes and metabolism", area:"Metabolism"},
    {page:"energy-chemistry.html", title:"Chemistry of energy production", area:"Metabolism"},
    {page:"respiration-overview.html", title:"Cellular respiration: the big picture", area:"Metabolism"},
    {page:"glycolysis.html", title:"Glycolysis", area:"Metabolism"},
    {page:"krebs.html", title:"The Krebs cycle", area:"Metabolism"},
    {page:"etc.html", title:"Electron transport chain and ATP synthase", area:"Metabolism"},
    {page:"fermentation.html", title:"Fermentation and anaerobic respiration", area:"Metabolism"}
  ];
  const KEY = "bio112-path", DONE = "bio112-path-done";
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  /* fermentation moved from stop 12 to stop 14 (after the ETC): carry saved progress over once */
  if (get("bio112-path-order") !== "2"){
    const mv = i => i === 11 ? 13 : i === 12 ? 11 : i === 13 ? 12 : i;
    try { const d = JSON.parse(get(DONE) || "[]"); if (d.length) set(DONE, JSON.stringify(d.map(mv))); } catch (e) {}
    if (get(KEY) !== null) set(KEY, String(mv(+get(KEY))));
    set("bio112-path-order", "2");
  }
  const done = () => { try { return JSON.parse(get(DONE) || "[]"); } catch (e) { return []; } };
  const markDone = i => { const d = done(); if (!d.includes(i)){ d.push(i); set(DONE, JSON.stringify(d)); } };
  const PAGE = location.pathname.split("/").pop() || "index.html";
  const viewsOf = s => Array.isArray(s.view) ? s.view : (s.view ? [s.view] : []);
  const href = s => { const vs = viewsOf(s); return s.page + (vs.length ? "#" + vs[0] : ""); };

  function go(i){
    const s = STOPS[i]; if (!s) return;
    set(KEY, String(i));
    const v0 = viewsOf(s)[0];
    if (s.page === PAGE && window.__op && v0){
      if (history.replaceState) history.replaceState(null, "", "#" + v0);
      window.__op.setView(v0); window.__op.goTo(0); render(); return;
    }
    location.href = href(s);
  }
  function start(){ set(DONE, null); go(0); }
  window.StudyPath = {STOPS, go, start, active:() => get(KEY) !== null, current:() => +(get(KEY) || 0), done};

  /* Which stop is this page showing right now? */
  function here(){
    const cands = STOPS.map((s, i) => i).filter(i => STOPS[i].page === PAGE);
    if (!cands.length) return -1;
    if (window.__op){ const v = window.__op.view; const i = cands.find(k => viewsOf(STOPS[k]).includes(v)); return i === undefined ? -1 : i; }
    return cands[0];
  }
  if (PAGE === "index.html") return;

  /* ---------- first visit to a module: point out the Learn/Test switch and the version switch ---------- */
  function tips(){
    const TK = "bio112-tips:" + PAGE;
    if (get(TK)) return;
    const mode = document.querySelector('.seg[aria-label="Mode"]');
    if (!mode || !mode.offsetParent) return;
    const ver = document.querySelector(".pwvariant");
    const st = document.createElement("style");
    st.textContent = `.sptipring{position:absolute;z-index:45;border:3px solid #f2b134;border-radius:999px;pointer-events:none;box-shadow:0 0 0 5px rgba(242,177,52,.25);animation:sptip 1.6s ease-in-out infinite}
    .sptip{position:absolute;z-index:46;width:min(300px,calc(100vw - 24px));background:#fff;border:2px solid #f2b134;border-radius:16px;padding:12px 14px;box-shadow:0 12px 30px rgba(29,36,51,.22);font:400 .95rem/1.45 var(--font,system-ui);color:#1d2433}
    .sptip::before{content:"";position:absolute;top:-10px;left:var(--ax,40px);width:16px;height:16px;background:#fff;border-left:2px solid #f2b134;border-top:2px solid #f2b134;transform:rotate(45deg)}
    .sptip b{color:#3f4cc0}.sptip .sph{display:block;font-weight:700;margin-bottom:4px;color:#8a5a00}
    .sptip button{margin-top:8px;font:700 .9rem var(--font,system-ui);border-radius:999px;padding:7px 16px;border:0;background:#3f4cc0;color:#fff;cursor:pointer}
    @keyframes sptip{0%,100%{box-shadow:0 0 0 3px rgba(242,177,52,.35)}50%{box-shadow:0 0 0 9px rgba(242,177,52,0)}}
    @media (prefers-reduced-motion:reduce){.sptipring{animation:none}}`;
    document.head.appendChild(st);
    const els = [], back = window.scrollY;
    /* the switches live in the page header: bring it into view, and return to the lesson afterwards */
    if (mode.getBoundingClientRect().top < 0) window.scrollTo({top:0, behavior:"auto"});
    const close = () => { if (!els.length) return; els.forEach(e => e.remove()); els.length = 0; set(TK, "1"); if (back > 0) window.scrollTo({top:back, behavior:"smooth"}); document.removeEventListener("pointerdown", outside, true); window.removeEventListener("resize", close); };
    const outside = e => { if (!els.some(x => x.contains(e.target))) close(); };
    const vlabels = ver ? [...ver.querySelectorAll("button")].map(b => b.textContent.trim()) : [];
    const items = [];
    if (ver) items.push([ver, `<span class="sph">🔍 Pick your version</span>${vlabels.map(l => `<b>${l}</b>`).join(" · ")}<br>New here? Start with <b>${vlabels[0]}</b>. When it clicks, level up to <b>${vlabels[1]}</b>${vlabels[2] ? ` or try <b>${vlabels[2]}</b>` : ""}.`]);
    items.push([mode, `<span class="sph">📖 Learn or ✏️ Test?</span><b>Learn</b> shows every key word. <b>Test</b> hides them so you can fill them in and check yourself. Switch anytime, you've got this!`]);
    let lastBottom = 0;
    items.forEach(([el, html], k) => {
      const r = el.getBoundingClientRect(), sx = window.scrollX, sy = window.scrollY;
      const ring = document.createElement("div"); ring.className = "sptipring";
      ring.style.cssText = `left:${r.left + sx - 6}px;top:${r.top + sy - 6}px;width:${r.width + 12}px;height:${r.height + 12}px`;
      const tip = document.createElement("div"); tip.className = "sptip"; tip.setAttribute("role", "note");
      tip.innerHTML = html + (k === items.length - 1 ? `<br><button type="button">Got it!</button>` : "");
      document.body.appendChild(ring); document.body.appendChild(tip); els.push(ring, tip);
      const w = tip.offsetWidth, vw = document.documentElement.clientWidth;
      const left = Math.max(12, Math.min(r.left + r.width / 2 - w / 2, vw - w - 12));
      const top = Math.max(r.bottom + 16, lastBottom + 18);
      tip.style.left = left + sx + "px"; tip.style.top = top + sy + "px";
      tip.style.setProperty("--ax", Math.max(14, Math.min(w - 30, r.left + r.width / 2 - left - 8)) + "px");
      if (top > r.bottom + 20) tip.style.setProperty("--ax", "-999px");
      lastBottom = top + tip.offsetHeight;
      const b = tip.querySelector("button"); if (b) b.addEventListener("click", close);
    });
    setTimeout(() => { document.addEventListener("pointerdown", outside, true); window.addEventListener("resize", close); }, 50);
  }
  window.addEventListener("load", () => setTimeout(tips, 350));

  if (get(KEY) === null){
    const nudgeCss = document.createElement("style");
    nudgeCss.textContent = `.spnudge{background:#fff;border:2px solid #3f4cc0;border-radius:16px;padding:8px 16px;margin:0 0 12px;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between;font-size:.92rem}
    .spnudge b{color:#3f4cc0}
    .spnudge button{font:700 .88rem var(--font,system-ui);border-radius:999px;padding:6px 14px;border:2px solid #3f4cc0;background:#3f4cc0;color:#fff;cursor:pointer}`;
    document.head.appendChild(nudgeCss);
    const nudge = document.createElement("div"); nudge.className = "spnudge";
    nudge.innerHTML = `<span>\u{1F9ED} <b>New here?</b> The Study Path walks you through every module in order.</span><button id="spNudgeGo">Start the Study Path →</button>`;
    const wrap0 = document.querySelector(".wrap");
    if (wrap0){ wrap0.insertBefore(nudge, wrap0.firstChild); nudge.querySelector("#spNudgeGo").addEventListener("click", start); }
    return;
  }

  const css = document.createElement("style");
  css.textContent = `
  .spbar{background:#fff;border:2px solid #3f4cc0;border-radius:16px;padding:10px 14px;margin:0 0 12px;display:grid;gap:8px}
  .spbar .sptop{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;justify-content:space-between}
  .spbar .spwhere{font-weight:700;font-size:.95rem}
  .spbar .spwhere small{display:block;color:#5a6376;font-size:.8rem}
  .spbar .spbtns{display:flex;gap:8px;flex-wrap:wrap}
  .spbar .spnext{font:700 .92rem var(--font,system-ui);border-radius:999px;padding:8px 16px;border:2px solid #3f4cc0;background:#3f4cc0;color:#fff;cursor:pointer}
  .spbar .spnext.ready{animation:spglow 1.4s ease-in-out infinite;background:#1b7f4e;border-color:#1b7f4e}
  .spbar .spexit{font:700 .82rem var(--font,system-ui);border-radius:999px;padding:6px 12px;border:1px solid #d9dee7;background:#fff;color:#5a6376;cursor:pointer}
  .spbar .spsegs{display:flex;gap:4px}
  .spbar .spsegs button{flex:1;height:10px;border-radius:5px;border:0;padding:0;background:#dfe4ec;cursor:pointer}
  .spbar .spsegs button.done{background:#7cc19a}
  .spbar .spsegs button.cur{background:#3f4cc0}
  .spdone{margin-top:14px;border:2px solid #1b7f4e;background:#e1f3e8;border-radius:16px;padding:14px 18px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
  .spdone b{color:#1b7f4e;font-size:1.05rem}
  .spdone button{font:700 1rem var(--font,system-ui);border-radius:999px;padding:10px 20px;border:0;background:#1b7f4e;color:#fff;cursor:pointer}
  body.onpath .bridge{display:none !important}
  @keyframes spglow{0%,100%{box-shadow:0 0 0 0 rgba(27,127,78,.35)}50%{box-shadow:0 0 0 7px rgba(27,127,78,0)}}
  @media (prefers-reduced-motion:reduce){ .spbar .spnext.ready{animation:none} }`;
  document.head.appendChild(css);
  document.body.classList.add("onpath");

  const wrap = document.querySelector(".wrap");
  const bar = document.createElement("div"); bar.className = "spbar"; bar.setAttribute("role", "navigation"); bar.setAttribute("aria-label", "Study path");
  wrap.insertBefore(bar, wrap.firstChild);
  const card = document.createElement("div"); card.className = "spdone"; card.hidden = true;
  const bubble = document.getElementById("bubble");
  if (bubble) bubble.insertAdjacentElement("afterend", card);

  function atEnd(){
    const n = document.getElementById("nextBtn");
    if (!n || n.offsetParent === null) return false;
    return n.textContent.trim() === "Start over" && !n.disabled;
  }
  function render(){
    let i = here();
    const onStop = i >= 0;
    if (onStop) set(KEY, String(i)); else i = +(get(KEY) || 0);
    const d = done(), s = STOPS[i], nx = STOPS[i + 1];
    const vs = viewsOf(s), curV = window.__op ? window.__op.view : null, vIdx = vs.indexOf(curV);
    const lastView = vs.length ? vs[vs.length - 1] : null;
    const onLastView = !lastView || curV === lastView;
    const fin = onStop && atEnd() && onLastView;
    const subNext = onStop && atEnd() && !onLastView && vIdx >= 0 ? vs[vIdx + 1] : null;
    const subName = k => (window.__op && window.__op.TRACKS[k] && window.__op.TRACKS[k].name) || k;
    if (fin) markDone(i);
    bar.innerHTML = `<div class="sptop"><div class="spwhere">Study path: stop ${i + 1} of ${STOPS.length}${onStop ? "" : " (you've stepped off the path)"}<small>${s.area}${s.area !== s.title ? ": " + s.title : ""}</small></div>
      <div class="spbtns">${onStop ? "" : `<button class="spnext" data-go="${i}">Back to stop ${i + 1}</button>`}${subNext ? `<button class="spnext ready" data-subgo="${subNext}">Study path: ${subName(subNext)} →</button>` : nx ? `<button class="spnext${fin ? " ready" : ""}" data-go="${i + 1}">Next stop: ${nx.title} →</button>` : `<button class="spnext${fin ? " ready" : ""}" data-home="1">Finish the study path ✓</button>`}<button class="spexit" data-exit="1">Exit path</button></div></div>
      <div class="spsegs">${STOPS.map((x, k) => `<button class="${k === i ? "cur" : d.includes(k) ? "done" : ""}" data-go="${k}" title="Stop ${k + 1}: ${x.title}" aria-label="Go to stop ${k + 1}: ${x.title}"></button>`).join("")}</div>`;
    card.hidden = !(fin || subNext);
    if (fin) card.innerHTML = nx ? `<b>Stop ${i + 1} complete! Next on your study path: ${nx.title}</b><button data-go="${i + 1}">Next stop →</button>` : `<b>You finished the whole study path. Amazing work!</b><button data-home="1">Back to all modules</button>`;
    else if (subNext) card.innerHTML = `<b>Study path: on to ${subName(subNext)}!</b><button data-subgo="${subNext}">Continue →</button>`;
    [bar, card].forEach(el => {
      el.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(+b.dataset.go));
      el.querySelectorAll("[data-subgo]").forEach(b => b.onclick = () => { window.__op.setView(b.dataset.subgo); window.__op.goTo(0); render(); });
      el.querySelectorAll("[data-home]").forEach(b => b.onclick = () => { set(KEY, null); location.href = "index.html"; });
      el.querySelectorAll("[data-exit]").forEach(b => b.onclick = () => { set(KEY, null); bar.remove(); card.remove(); document.body.classList.remove("onpath"); });
    });
  }
  let queued = false;
  const later = () => { if (queued) return; queued = true; setTimeout(() => { queued = false; if (bar.isConnected) render(); }, 60); };
  document.addEventListener("click", later, true);
  window.addEventListener("hashchange", later);
  window.addEventListener("load", () => {
    render();
    const n = document.getElementById("nextBtn");
    if (n) new MutationObserver(later).observe(n, {attributes:true, childList:true, characterData:true, subtree:true});
  });
})();
