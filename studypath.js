/* Study path: one guided route through every major module, in order.
   While the path is on, each page shows a banner with the current stop and a button to the next one. */
(function(){
  const STOPS = [
    {page:"pretranscriptional-control.html", view:"euk", title:"Gene regulation in eukaryotes", area:"Pre-transcriptional control"},
    {page:"pretranscriptional-control.html", view:"basics", title:"Operon basics", area:"Pre-transcriptional control"},
    {page:"pretranscriptional-control.html", view:"ind", title:"Inducible operons: lac", area:"Pre-transcriptional control"},
    {page:"pretranscriptional-control.html", view:"rep", title:"Repressible operons: trp", area:"Pre-transcriptional control"},
    {page:"transcription.html", title:"Transcription", area:"Transcription"},
    {page:"posttranscriptional-control.html", title:"Post-transcriptional control", area:"Post-transcriptional control"},
    {page:"translation.html", title:"Translation", area:"Translation"},
    {page:"mutations.html", title:"Mutations", area:"Mutations"},
    {page:"enzymes.html", title:"Enzymes and metabolism", area:"Chapter 5: Metabolism"},
    {page:"energy-chemistry.html", title:"Chemistry of energy production", area:"Chapter 5: Metabolism"},
    {page:"glycolysis.html", title:"Glycolysis", area:"Chapter 5: Metabolism"},
    {page:"krebs-etc.html", title:"Krebs cycle, ETC and ATP synthase", area:"Chapter 5: Metabolism"},
    {page:"fermentation.html", title:"Fermentation and anaerobic respiration", area:"Chapter 5: Metabolism"}
  ];
  const KEY = "bio112-path", DONE = "bio112-path-done";
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const done = () => { try { return JSON.parse(get(DONE) || "[]"); } catch (e) { return []; } };
  const markDone = i => { const d = done(); if (!d.includes(i)){ d.push(i); set(DONE, JSON.stringify(d)); } };
  const PAGE = location.pathname.split("/").pop() || "index.html";
  const href = s => s.page + (s.view ? "#" + s.view : "");

  function go(i){
    const s = STOPS[i]; if (!s) return;
    set(KEY, String(i));
    if (s.page === PAGE && window.__op && s.view){
      if (history.replaceState) history.replaceState(null, "", "#" + s.view);
      window.__op.setView(s.view); window.__op.goTo(0); render(); return;
    }
    location.href = href(s);
  }
  function start(){ set(DONE, null); go(0); }
  window.StudyPath = {STOPS, go, start, active:() => get(KEY) !== null, current:() => +(get(KEY) || 0), done};

  /* Which stop is this page showing right now? */
  function here(){
    const cands = STOPS.map((s, i) => i).filter(i => STOPS[i].page === PAGE);
    if (!cands.length) return -1;
    if (window.__op){ const v = window.__op.view; const i = cands.find(k => STOPS[k].view === v); return i === undefined ? -1 : i; }
    return cands[0];
  }
  if (PAGE === "index.html" || get(KEY) === null) return;

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
    const d = done(), s = STOPS[i], nx = STOPS[i + 1], fin = onStop && atEnd();
    if (fin) markDone(i);
    bar.innerHTML = `<div class="sptop"><div class="spwhere">Study path: stop ${i + 1} of ${STOPS.length}${onStop ? "" : " (you've stepped off the path)"}<small>${s.area}${s.area !== s.title ? ": " + s.title : ""}</small></div>
      <div class="spbtns">${onStop ? "" : `<button class="spnext" data-go="${i}">Back to stop ${i + 1}</button>`}${nx ? `<button class="spnext${fin ? " ready" : ""}" data-go="${i + 1}">Next stop: ${nx.title} →</button>` : `<button class="spnext${fin ? " ready" : ""}" data-home="1">Finish the study path ✓</button>`}<button class="spexit" data-exit="1">Exit path</button></div></div>
      <div class="spsegs">${STOPS.map((x, k) => `<button class="${k === i ? "cur" : d.includes(k) ? "done" : ""}" data-go="${k}" title="Stop ${k + 1}: ${x.title}" aria-label="Go to stop ${k + 1}: ${x.title}"></button>`).join("")}</div>`;
    card.hidden = !fin;
    if (fin) card.innerHTML = nx ? `<b>Stop ${i + 1} complete! Next on your study path: ${nx.title}</b><button data-go="${i + 1}">Next stop →</button>` : `<b>You finished the whole study path. Amazing work!</b><button data-home="1">Back to all modules</button>`;
    [bar, card].forEach(el => {
      el.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(+b.dataset.go));
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
