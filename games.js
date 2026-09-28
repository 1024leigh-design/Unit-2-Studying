/* Shared helpers for the timed games (Replication Race, Transcription Race, Translation Race, Splice Lab, DNA Editor).
   Scores are saved in this browser's localStorage, so students can come back and see their history. */
(function(){
  const get = k => { try { const v = JSON.parse(localStorage.getItem(k) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const fmt = t => t >= 60 ? `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}` : `${t.toFixed(1)}s`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"})[c]);

  /* record one finished round: {t: seconds, m: mistakes (optional), label: short text (optional)} */
  function add(key, rec){
    const all = get(key), prevBest = all.length ? Math.min(...all.map(r => r.t)) : null;
    const r = {t:rec.t, m:rec.m || 0, label:rec.label || "", d:Date.now()};
    all.push(r); while (all.length > 60) all.shift();
    put(key, all);
    return {rec:r, newBest:prevBest === null || r.t < prevBest, rounds:all.length};
  }
  const best = key => { const a = get(key); return a.length ? Math.min(...a.map(r => r.t)) : null; };
  const rounds = key => get(key).length;

  /* a scoreboard: best 5 times plus the 3 most recent rounds */
  function board(key, opts){
    opts = opts || {};
    const all = get(key);
    if (!all.length) return `<div class="gboard"><div class="gbhead">🏆 Your scores</div><div class="gbempty">No rounds yet. Your times will be saved on this browser.</div></div>`;
    const line = (r, star) => `<li>${star ? "⭐ " : ""}<b>${fmt(r.t)}</b>${opts.mistakes === false ? "" : ` · ${r.m} mistake${r.m === 1 ? "" : "s"}`}${r.label ? ` · ${esc(r.label)}` : ""} <span class="gbdate">${new Date(r.d).toLocaleDateString()}</span></li>`;
    const top = all.slice().sort((a, b) => a.t - b.t).slice(0, 5), recent = all.slice(-3).reverse();
    return `<div class="gboard"><div class="gbhead">🏆 Your best times <span class="gbsub">(${all.length} round${all.length === 1 ? "" : "s"} played on this browser)</span></div><ol>${top.map((r, i) => line(r, i === 0)).join("")}</ol><div class="gbhead2">Most recent</div><ul>${recent.map(r => line(r, false)).join("")}</ul></div>`;
  }

  /* a tiny stopwatch: start() on the first move, stop() returns seconds; attach() keeps an element updated */
  function stopwatch(){
    let t0 = null, t1 = null, el = null, raf = null;
    const now = () => t0 === null ? 0 : ((t1 || performance.now()) - t0) / 1000;
    const tick = () => { if (el && document.body.contains(el)) el.textContent = fmt(now()); if (t0 !== null && t1 === null) raf = requestAnimationFrame(tick); };
    return {
      start(){ if (t0 === null){ t0 = performance.now(); t1 = null; cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); } },
      stop(){ if (t0 !== null && t1 === null) t1 = performance.now(); tick(); return now(); },
      reset(){ t0 = null; t1 = null; cancelAnimationFrame(raf); if (el) el.textContent = fmt(0); },
      attach(e){ el = e; tick(); if (t0 !== null && t1 === null){ cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); } },
      get running(){ return t0 !== null && t1 === null; },
      get time(){ return now(); }
    };
  }

  /* full-screen celebration for HTML-based games */
  function celebrate(text){
    let host = document.getElementById("bgCele");
    if (!host){ host = document.createElement("div"); host.id = "bgCele"; document.body.appendChild(host); }
    const cols = ["#f2b134", "#2f9e63", "#3b7dd8", "#e05a8a", "#8e5bd0", "#e8744f"];
    let bits = "";
    for (let i = 0; i < 36; i++){ const a = (i / 36) * Math.PI * 2, d = 120 + (i * 53 % 140); bits += `<i style="--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d - 60).toFixed(0)}px;--r:${i * 47 % 360}deg;background:${cols[i % cols.length]}"></i>`; }
    host.innerHTML = `<div class="bgburst">${bits}</div><div class="bgbanner">🎉 ${esc(text)}</div>`;
    host.classList.remove("on"); void host.offsetWidth; host.classList.add("on");
    clearTimeout(celebrate.h); celebrate.h = setTimeout(() => host.classList.remove("on"), 2600);
  }
  /* styles for the scoreboard and celebration, injected once */
  const css = `.gboard{background:#fff;border:1.5px solid #e2d6a6;border-radius:12px;padding:10px 14px;font-size:.92rem}
    .gboard ol,.gboard ul{margin:4px 0 6px;padding-left:22px;line-height:1.6}.gbhead{font-weight:800;color:#8a5a00}.gbhead2{font-weight:700;color:#5a6376;font-size:.85rem;margin-top:4px}
    .gbsub{font-weight:400;color:#5a6376;font-size:.82rem}.gbdate{color:#8a93a3;font-size:.8rem}.gbempty{color:#5a6376}
    .gracebar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;background:#fff8e6;border:2px solid #f0d99a;border-radius:14px;padding:10px 14px;font-weight:700}
    .gracebar .gclock{font-size:1.35rem;font-variant-numeric:tabular-nums;color:#1d2433;min-width:84px}.gracebar .gstat{color:#5a6376}
    #bgCele{position:fixed;inset:0;pointer-events:none;z-index:120;display:grid;place-items:center;opacity:0}
    #bgCele.on{opacity:1}#bgCele .bgburst{position:absolute;left:50%;top:40%}
    #bgCele i{position:absolute;width:10px;height:5px;border-radius:2px;opacity:0}
    #bgCele.on i{animation:bgfly 1.4s ease-out forwards}
    @keyframes bgfly{0%{opacity:1;transform:translate(0,0) rotate(0)}100%{opacity:0;transform:translate(var(--dx),calc(var(--dy) + 160px)) rotate(var(--r))}}
    #bgCele .bgbanner{position:absolute;top:18%;background:#1b7f4e;color:#fff;font:800 1.2rem system-ui,sans-serif;padding:12px 24px;border-radius:999px;border:3px solid #fff;box-shadow:0 10px 30px rgba(0,0,0,.25);transform:scale(.8);transition:transform .25s}
    #bgCele.on .bgbanner{transform:scale(1)}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const randBases = (n, alpha) => Array.from({length:n}, () => pick(alpha || "ATGC")).join("");
  window.BioGames = {add, best, rounds, board, fmt, stopwatch, celebrate, pick, randBases, load:get};
})();
