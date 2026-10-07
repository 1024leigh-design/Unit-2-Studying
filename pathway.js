/* Pathway board engine for the respiration modules (glycolysis, Krebs, ETC, fermentation).
   The whole pathway lives on one tall board, top to bottom. Students do each step right on the board
   (drag a token onto a target, or click a button), the board animates, and an explanation card pops up
   beside that part of the pathway. Closing a card shrinks it to a numbered marker that can be reopened.
   A module calls Pathway.start({title, page, H, BL, MORE, steps, draw, token, tally, next}). */
(function(){
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const f1 = v => (+v).toFixed(1);
  let GEN = 0; /* bumped each start() call, so a stale instance's loops/listeners can tell they're dead */

  function start(cfg){
    const myGen = ++GEN;
    const BL = window.__BL = cfg.BL || {}, MORE = cfg.MORE || {}, STEPS = cfg.steps, H = cfg.H || 1400;
    const PAGE = location.pathname.split("/").pop() || cfg.page;
    document.title = cfg.title;
    (document.getElementById("app") || document.body).innerHTML = `<div class="wrap pwwrap">
      <header><div><a class="backlink" href="index.html">All modules</a><h1>${cfg.title}<span class="chap">Chapter 5</span></h1></div>
        <div class="controls">${cfg.variants ? `<div class="seg pwvariant" role="group" aria-label="Detail level">${cfg.variants.map(v => `<button data-variant="${v.key}" aria-pressed="${v.key === cfg.variant}">${v.label}</button>`).join("")}</div>` : ""}<div class="seg" role="group" aria-label="Mode"><button id="learnBtn" aria-pressed="${cfg.mode === "test" ? "false" : "true"}">Learn</button><button id="testBtn" aria-pressed="${cfg.mode === "test" ? "true" : "false"}">Test</button></div><button class="ghost" id="restartBtn">Restart</button></div></header>
      ${cfg.intro ? `<p class="pwintro">${cfg.intro}</p>` : ""}
      <div class="pwbar" id="pwBar"><div class="pwdo" id="pwDo"></div><div class="pwtally" id="pwTally"></div></div>
      <div class="pwboard" id="pwBoard"><svg id="pwSvg" viewBox="0 0 1000 ${H}" role="img" aria-label="${cfg.title} pathway board"></svg><div class="pwlayer" id="pwLayer"></div></div>
      <div class="pwend" id="pwEnd" hidden></div>
    </div>
    <div class="overlay" id="moreOverlay" hidden><div class="panel" role="dialog" aria-modal="true" aria-labelledby="moreTitle"><span class="ptag">Learn more</span><h2 id="moreTitle"></h2><div id="moreBody"></div><button class="btn primary close" id="moreClose">Back to the module</button></div></div>`;
    const $ = id => document.getElementById(id);
    const svg = $("pwSvg"), layer = $("pwLayer");
    /* on narrow screens cards become bottom sheets, so crop the board to the pathway column */
    const VW = () => ($("pwBoard").clientWidth < 720 && cfg.narrowW) ? cfg.narrowW : 1000;
    const fitView = () => svg.setAttribute("viewBox", `0 0 ${VW()} ${H}`);
    fitView();
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let mode = cfg.mode === "test" ? "test" : "learn", idx, phase, t0, placed, filled, used = [], drag, bl, openPop, tally, finished;
    function reset(){
      idx = 0; phase = "act"; t0 = 0; placed = 0; filled = []; drag = null; bl = {}; openPop = null; tally = {}; finished = false;
      $("pwEnd").hidden = true;
      beginStep(true);
    }
    const S = () => STEPS[idx];
    const resolved = id => mode === "learn" || !!bl[id];
    const R = id => resolved(id) ? BL[id].show : "?";
    /* how far along step i is: 1 = done, 0 = not started */
    const prog = i => {
      if (i < idx) return 1;
      if (i > idx) return 0;
      if (phase === "anim") return clamp((performance.now() - t0) / (S().animMs || 1400), 0, 1);
      return phase === "pop" || phase === "done" ? 1 : 0;
    };

    function beginStep(first){
      placed = 0; filled = []; used = []; drag = null;
      const st = S();
      if (!st.action){ phase = "anim"; t0 = performance.now(); }
      else phase = "act";
      renderBar(); renderMarkers();
      const a = st.action, ys = !a ? [] : a.type === "click" ? [a.at[1]] : a.from.slice(0, a.count).concat(a.targets).map(q => q[1]);
      scrollToY(st.focusY || (st.pop && st.pop.y) || 0, first, ys);
    }
    function finishAction(){
      phase = "anim"; t0 = performance.now();
      const st = S();
      if (st.tally) for (const k in st.tally) tally[k] = (tally[k] || 0) + st.tally[k];
      renderBar();
    }
    function toPop(){ phase = "pop"; renderBar(); openCard(idx, true); }
    function closeCard(){
      const i = openPop; openPop = null; layer.querySelectorAll(".pwcard").forEach(c => c.remove());
      if (i === idx && phase === "pop"){
        if (idx >= STEPS.length - 1){ phase = "done"; finish(); }
        else { idx++; beginStep(); }
      }
      renderMarkers();
    }

    /* ---------- scrolling ---------- */
    function scrollToY(y, instant, keep){
      const r = svg.getBoundingClientRect(), k = r.height / H;
      let target = window.scrollY + r.top + y * k - window.innerHeight * .38;
      /* whatever the student has to act on must not hide under the sticky prompt bar (or below the screen) */
      if (keep && keep.length){
        const bar = $("pwBar").getBoundingClientRect().height + 24, abs = v => window.scrollY + r.top + v * k;
        const lo = abs(Math.min(...keep)) - 46 * k, hi = abs(Math.max(...keep)) + 46 * k;
        if (hi - target > window.innerHeight - 16) target = hi - window.innerHeight + 16;
        if (lo - target < bar) target = lo - bar;
      }
      window.scrollTo({top:Math.max(0, target), behavior:(instant || reduced) ? "auto" : "smooth"});
    }

    /* ---------- the prompt + tally bar ---------- */
    function renderBar(){
      const st = S(), a = st.action;
      let h = "";
      if (phase === "done") h = `<span class="pwok">✓ Pathway complete!</span>`;
      else if (phase === "act" && a) h = `<span class="pwstep">${idx + 1}</span><span>${a.label}</span>${a.type === "drag" && a.count > 1 ? `<span class="pwcount">${placed} of ${a.count}</span>` : ""}<button class="btn sm secondary" id="pwAuto" type="button">Do it for me</button>`;
      else if (phase === "anim") h = `<span class="pwstep">${idx + 1}</span><span class="pwmuted">Watch the pathway…</span>`;
      else h = `<span class="pwstep">${idx + 1}</span><span class="pwmuted">Read the card, then tap <b>Got it</b>.</span>`;
      $("pwDo").innerHTML = h;
      const auto = $("pwAuto"); if (auto) auto.addEventListener("click", () => { if (phase !== "act") return; if (a.type === "drag"){ while (placed < a.count) placeOne(); } else finishAction(); });
      const T = cfg.tally || [];
      $("pwTally").innerHTML = T.map(([k, lbl, col, fn]) => { const v = fn ? fn(tally) : (tally[k] || 0); return `<span class="pwchip" style="--c:${col || "#3f4cc0"}"><b>${v}</b> ${lbl}</span>`; }).join("");
    }

    /* ---------- cards (pop-ups) and markers ---------- */
    const lev = (a, b) => { const m = a.length, n = b.length, d = []; for (let i = 0; i <= m; i++) d[i] = [i]; for (let j = 0; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)); return d[m][n]; };
    const norm = s => s.toLowerCase().replace(/₂/g, "2").replace(/⁺/g, "").replace(/[^a-z0-9]/g, "");
    const matches = (id, val) => { const b = BL[id], v = norm(val); if (!v) return false; return b.ans.some(a => a === v || (b.fuzzy && a.length >= 5 && lev(v, a) <= 1)); };
    const blanksOf = st => ((st.pop && st.pop.text) || "").match(/\{\{(\w+)\}\}/g)?.map(m => m.slice(2, -2)) || [];
    const term = (id, cls) => `<strong class="term ${cls || ""}">${BL[id].show}</strong>`;
    function cardText(st, live){
      return st.pop.text.replace(/\{\{(\w+)\}\}/g, (m, id) => {
        if (mode === "learn" || !live) return term(id, bl[id] || "");
        if (bl[id]) return term(id, bl[id]);
        return `<input class="blank" data-id="${id}" size="${Math.max(3, BL[id].show.length + 1)}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Fill in the blank">`;
      });
    }
    function cardPos(st){
      const bw = $("pwBoard").clientWidth, narrow = bw < 720;
      const x = (st.pop.x !== undefined ? st.pop.x : 650) / VW() * bw, y = st.pop.y / H * svg.getBoundingClientRect().height;
      return {narrow, left:x, top:y};
    }
    function openCard(i, live){
      layer.querySelectorAll(".pwcard").forEach(c => c.remove());
      openPop = i;
      const st = STEPS[i], p = cardPos(st), blanks = blanksOf(st);
      const needs = live && mode === "test" && blanks.some(id => !bl[id]);
      const c = document.createElement("div");
      c.className = "pwcard" + (p.narrow ? " sheet" : "");
      if (!p.narrow){ c.style.left = p.left + "px"; c.style.top = p.top + "px"; }
      c.innerHTML = `<div class="pwch"><span class="pwnum">${i + 1}</span><b>${st.pop.title}</b>${!live ? `<button class="pwx" aria-label="Close">×</button>` : ""}</div>
        <p class="pwtext">${cardText(st, live)}</p>
        <div class="pwfb" id="pwFb"></div>
        <div class="pwcta">${needs ? `<button class="btn primary sm" id="pwCheck">Check</button><button class="btn secondary sm" id="pwReveal">Show answer</button>` : ""}
          <button class="btn primary sm" id="pwGot" ${needs ? "hidden" : ""}>${live ? (i >= STEPS.length - 1 ? "Finish ✓" : "Got it ✓") : "Close"}</button>
          ${st.pop.more && MORE[st.pop.more] ? `<button class="more-btn" data-more="${st.pop.more}">Learn more</button>` : ""}</div>`;
      layer.appendChild(c);
      /* keep the whole card inside the board: near the top or bottom of a tall board the card
         would otherwise hang off the edge (it is centered on its y with translateY(-50%)) */
      if (!p.narrow){
        const bw = $("pwBoard").clientWidth, bh = $("pwBoard").clientHeight, h = c.offsetHeight, w = c.offsetWidth;
        c.style.top = clamp(p.top, h / 2 + 8, Math.max(h / 2 + 8, bh - h / 2 - 8)) + "px";
        c.style.left = Math.max(8, Math.min(p.left, bw - w - 8)) + "px";
      }
      renderMarkers();
      const got = c.querySelector("#pwGot"), fb = c.querySelector("#pwFb");
      got.addEventListener("click", closeCard);
      const x = c.querySelector(".pwx"); if (x) x.addEventListener("click", closeCard);
      c.querySelectorAll("[data-more]").forEach(b => b.addEventListener("click", () => openMore(b.dataset.more)));
      const done = () => { c.querySelector(".pwtext").innerHTML = cardText(st, live); ["#pwCheck", "#pwReveal"].forEach(s => { const e = c.querySelector(s); if (e) e.hidden = true; }); got.hidden = false; got.focus({preventScroll:true}); };
      const chk = c.querySelector("#pwCheck");
      if (chk){
        const check = () => {
          let wrong = 0;
          c.querySelectorAll("input.blank").forEach(inp => { if (matches(inp.dataset.id, inp.value)) bl[inp.dataset.id] = "correct"; else { wrong++; inp.classList.remove("wrong"); void inp.offsetWidth; inp.classList.add("wrong"); } });
          if (wrong){ fb.className = "pwfb bad"; fb.textContent = "Not quite. Try again, or tap Show answer."; }
          else { fb.className = "pwfb good"; fb.textContent = "Correct!"; done(); }
        };
        chk.addEventListener("click", check);
        c.querySelectorAll("input.blank").forEach(inp => inp.addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); check(); } }));
        c.querySelector("#pwReveal").addEventListener("click", () => { blanks.forEach(id => { if (!bl[id]) bl[id] = "revealed"; }); fb.className = "pwfb warn"; fb.textContent = "Here's the answer. Read it over, then tap Got it."; done(); });
        const first = c.querySelector("input.blank"); if (first) first.focus({preventScroll:true});
      } else if (live) got.focus({preventScroll:true});
    }
    function renderMarkers(){
      layer.querySelectorAll(".pwmark").forEach(m => m.remove());
      const bw = $("pwBoard").clientWidth, sh = svg.getBoundingClientRect().height;
      /* a card covers part of the marker column, so drop the markers it would sit on top of */
      const card = layer.querySelector(".pwcard");
      let box = null;
      /* measured from layout, not getBoundingClientRect: the card plays a pop animation and its
         live rect is mid-transform at the moment this runs */
      if (card && !card.classList.contains("sheet")){
        const l = parseFloat(card.style.left) || 0, t = parseFloat(card.style.top) || 0, h = card.offsetHeight;
        box = {l:l - 22, r:l + card.offsetWidth + 22, t:t - h / 2 - 22, b:t + h / 2 + 22}; }
      STEPS.forEach((st, i) => {
        if (!st.pop || i > idx || (i === idx && phase !== "done" && !(phase === "pop" && openPop !== i))) return;
        /* the open card sits at the same x as its marker, so the marker would be half-buried under it */
        if (i === openPop) return;
        const b = document.createElement("button");
        b.className = "pwmark"; b.type = "button"; b.textContent = i + 1; b.title = st.pop.title;
        b.setAttribute("aria-label", `Reopen card ${i + 1}: ${st.pop.title}`);
        const mx = Math.min(st.pop.x !== undefined ? st.pop.x : 650, VW() - 18) / VW() * bw, my = st.pop.y / H * sh;
        if (box && mx > box.l && mx < box.r && my > box.t && my < box.b) return;
        b.style.left = mx + "px"; b.style.top = my + "px";
        b.addEventListener("click", () => openCard(i, false));
        layer.appendChild(b);
      });
    }
    window.addEventListener("resize", () => { if (myGen !== GEN) return; fitView(); renderMarkers(); if (openPop !== null){ const i = openPop; openCard(i, i === idx && phase === "pop"); } });

    /* ---------- learn more ---------- */
    function openMore(k){ const m = MORE[k]; $("moreTitle").textContent = m.title; $("moreBody").innerHTML = m.html; $("moreOverlay").hidden = false; $("moreClose").focus(); }
    $("moreClose").addEventListener("click", () => { $("moreOverlay").hidden = true; });
    $("moreOverlay").addEventListener("click", e => { if (e.target.id === "moreOverlay") $("moreOverlay").hidden = true; });

    /* ---------- actions on the board ---------- */
    const svgPt = e => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
    function placeOne(ti, fromK){
      const a = S().action;
      const fk = fromK !== undefined && !used.includes(fromK) ? fromK : a.from.map((_, k) => k).find(k => !used.includes(k));
      if (fk !== undefined) used.push(fk);
      const free = a.targets.map((_, k) => k).filter(k => !filled.includes(k));
      if (!free.length) return;
      filled.push(ti !== undefined && free.includes(ti) ? ti : free[0]); placed++;
      if (placed >= a.count) finishAction(); else renderBar();
    }
    svg.addEventListener("pointerdown", e => {
      if (phase !== "act") return;
      const a = S().action, el = e.target.closest && e.target.closest("[data-pw]");
      if (!el) return;
      e.preventDefault();
      if (a.type === "click"){ finishAction(); return; }
      const p = svgPt(e);
      drag = {k:+el.dataset.pw, x:p.x, y:p.y, sx:p.x, sy:p.y, moved:false};
      svg.style.touchAction = "none";
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}
    });
    svg.addEventListener("pointermove", e => { if (!drag) return; const p = svgPt(e); drag.x = p.x; drag.y = p.y; if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 8) drag.moved = true; });
    const end = () => {
      if (!drag) return;
      const d = drag; drag = null; svg.style.touchAction = "";
      const a = S().action;
      if (!d.moved){ placeOne(undefined, d.k); return; }
      const hit = a.targets.map((t, k) => ({k, dist:Math.hypot(d.x - t[0], d.y - t[1])})).filter(o => !filled.includes(o.k) && o.dist < (a.r || 70)).sort((p, q) => p.dist - q.dist)[0];
      if (hit) placeOne(hit.k, d.k);
    };
    svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", end);
    /* The board is redrawn every animation frame, so a native SVG <a> is destroyed
       mid-click and never navigates. Resolve the link ourselves on a clean tap. */
    let tapX = 0, tapY = 0;
    svg.addEventListener("pointerdown", e => { tapX = e.clientX; tapY = e.clientY; }, true);
    svg.addEventListener("pointerup", e => {
      if (drag || Math.hypot(e.clientX - tapX, e.clientY - tapY) > 10) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const a = el && el.closest && el.closest("a");
      if (!a) return;
      const href = a.getAttribute("href") || a.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if (href) window.location.href = href;
    });

    /* ---------- drawing ---------- */
    function actionLayer(t){
      if (phase !== "act") return "";
      const a = S().action, pu = .5 + .5 * Math.sin(t * 5);
      let o = "";
      if (a.type === "click"){
        const w = (a.button || a.label).length * 9.4 + 48, [x, y] = a.at;
        o += `<g data-pw="0" style="cursor:pointer"><rect x="${f1(x - w / 2 - 6 * pu)}" y="${f1(y - 24 - 3 * pu)}" width="${f1(w + 12 * pu)}" height="${f1(48 + 6 * pu)}" rx="26" fill="#f2b134" opacity=".3"/><rect x="${f1(x - w / 2)}" y="${y - 22}" width="${f1(w)}" height="44" rx="22" fill="#3f4cc0"/><text x="${x}" y="${y + 6}" font-size="17" font-weight="800" fill="#fff" text-anchor="middle">${a.button || a.label}</text></g>`;
        return o;
      }
      a.targets.forEach((tg, k) => { if (filled.includes(k)) o += a.hideFilled ? "" : cfg.token(a.token, tg[0], tg[1]); else o += `<circle cx="${tg[0]}" cy="${tg[1]}" r="${f1(34 + 5 * pu)}" fill="rgba(242,177,52,.12)" stroke="#f2b134" stroke-width="3" stroke-dasharray="7 6"/>`; });
      a.from.forEach((fp, k) => {
        if (used.includes(k) || k >= a.count) return;
        const moving = drag && drag.moved && drag.k === k;
        const x = moving ? drag.x : fp[0], y = moving ? drag.y : fp[1];
        if (!moving) o += `<circle cx="${fp[0]}" cy="${fp[1]}" r="${f1(30 + 4 * pu)}" fill="none" stroke="#3f4cc0" stroke-width="2.5" opacity="${f1(.35 + .4 * pu)}"/>`;
        o += `<g data-pw="${k}" style="cursor:grab"><circle cx="${f1(x)}" cy="${f1(y)}" r="34" fill="#fff" opacity=".01"/>${cfg.token(a.token, x, y)}</g>`;
      });
      return o;
    }
    let T0 = performance.now();
    function frame(now){
      if (myGen !== GEN) return; /* a newer Pathway.start() replaced this one; let this loop die quietly */
      const t = (now - T0) / 1000;
      if (phase === "anim" && prog(idx) >= 1) toPop();
      const ctx = {idx, phase, prog, placed, filled, t, R, resolved, H};
      svg.innerHTML = cfg.draw(ctx) + actionLayer(t);
      requestAnimationFrame(frame);
    }

    /* ---------- the end ---------- */
    function finish(){
      renderBar(); renderMarkers();
      if (mode === "test") try { localStorage.setItem("bio112-done:" + PAGE, "1"); } catch (e) {}
      if (window.BioGames) BioGames.celebrate("Pathway complete!");
      const E = $("pwEnd"); E.hidden = false;
      E.innerHTML = `<div class="pwendin"><b>${cfg.endTitle || "You built the whole pathway!"}</b><p>${cfg.endText || "Tap any numbered marker on the board to review a step."}</p><div class="pwlinks">${(cfg.next || []).map(([l, h]) => `<a class="btn ${h === "index.html" ? "secondary" : "primary"}" href="${h}">${l}</a>`).join("")}${cfg.hideRestart ? "" : `<button class="btn secondary" id="pwAgain">Start over</button>`}</div></div>`;
      if (!cfg.hideRestart) $("pwAgain").addEventListener("click", reset);
      setTimeout(() => E.scrollIntoView({behavior:reduced ? "auto" : "smooth", block:"center"}), 600);
    }

    function setMode(m){
      mode = m;
      $("learnBtn").setAttribute("aria-pressed", m === "learn"); $("testBtn").setAttribute("aria-pressed", m === "test");
      reset();
    }
    $("learnBtn").addEventListener("click", () => setMode("learn"));
    $("testBtn").addEventListener("click", () => setMode("test"));
    $("restartBtn").addEventListener("click", reset);
    document.addEventListener("keydown", e => { if (myGen !== GEN) return; if (e.key === "Escape"){ if (!$("moreOverlay").hidden) $("moreOverlay").hidden = true; else if (openPop !== null && !(openPop === idx && phase === "pop")) closeCard(); } });
    if (cfg.variants) document.querySelectorAll(".pwvariant button").forEach(b => b.addEventListener("click", () => cfg.onVariant(b.dataset.variant)));
    reset();
    requestAnimationFrame(frame);
    window.__pw = {get idx(){ return idx; }, get phase(){ return phase; }, get tally(){ return tally; }, get mode(){ return mode; }, auto:() => { const a = S().action; if (phase !== "act") return; if (a.type === "drag"){ while (placed < a.count) placeOne(); } else finishAction(); }, got:() => { const b = document.getElementById("pwGot"); if (b && !b.hidden) b.click(); }, setMode, STEPS};
  }

  /* styles, injected once */
  const css = `.pwintro{color:var(--muted);margin:0 0 10px;max-width:80ch}
  .pwvariant{margin-right:10px}
  .pwbar{position:sticky;top:0;z-index:20;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;justify-content:space-between;background:#fff;border:2px solid var(--accent);border-radius:14px;padding:8px 12px;margin-bottom:10px;box-shadow:0 6px 16px rgba(29,36,51,.10)}
  .pwdo{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-weight:700}
  .pwstep{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--accent);color:#fff;font-size:.85rem}
  .pwmuted{color:var(--muted);font-weight:400}.pwok{color:var(--good)}
  .pwcount{background:#fff6d6;border:1px solid #f0d99a;border-radius:999px;padding:1px 9px;font-size:.85rem}
  .pwtally{display:flex;flex-wrap:wrap;gap:6px}
  .pwchip{border:2px solid var(--c);color:var(--c);background:#fff;border-radius:999px;padding:3px 10px;font-weight:700;font-size:.85rem}
  .pwchip b{font-size:1rem}
  .pwboard{position:relative;background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden}
  #pwSvg{display:block;width:100%;height:auto;font-family:var(--font)}
  .pwlayer{position:absolute;inset:0;pointer-events:none}
  .pwlayer > *{pointer-events:auto}
  .pwcard{position:absolute;transform:translateY(-50%);width:min(330px,34%);min-width:250px;background:#fff;border:2px solid var(--accent);border-radius:16px;padding:12px 14px;box-shadow:0 14px 34px rgba(29,36,51,.22);animation:pwpop .3s cubic-bezier(.2,.9,.3,1.25);z-index:5}
  .pwcard.sheet{position:fixed;left:8px;right:8px;bottom:8px;top:auto;transform:none;width:auto;max-height:60vh;overflow:auto}
  @keyframes pwpop{from{opacity:0;transform:translateY(-50%) scale(.85)}to{opacity:1;transform:translateY(-50%) scale(1)}}
  .pwcard.sheet{animation:none}
  .pwch{display:flex;align-items:center;gap:8px;margin-bottom:6px}.pwch b{flex:1}
  .pwnum{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#f2b134;color:#3b2a00;font-weight:800;font-size:.85rem;flex:none}
  .pwx{border:0;background:none;font-size:1.4rem;line-height:1;color:#8a93a3;cursor:pointer}
  .pwtext{margin:0 0 8px;line-height:1.55;font-size:.97rem}
  .pwfb{font-weight:700;font-size:.9rem;min-height:0}.pwfb.good{color:var(--good)}.pwfb.bad{color:var(--bad)}.pwfb.warn{color:var(--warn)}
  .pwcta{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  .pwmark{position:absolute;transform:translate(-50%,-50%);width:34px;height:34px;border-radius:50%;border:3px solid #fff;background:#f2b134;color:#3b2a00;font:800 .95rem var(--font);cursor:pointer;box-shadow:0 3px 8px rgba(0,0,0,.2)}
  .pwmark:hover{transform:translate(-50%,-50%) scale(1.12)}
  .pwend{margin-top:14px}.pwendin{background:var(--good-soft);border:2px solid #9fd3b5;border-radius:16px;padding:14px 16px}.pwendin b{color:var(--good);font-size:1.1rem}
  .pwlinks{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
  input.blank{font:700 1rem var(--font)}
  @media (max-width:600px){.pwbar{padding:6px 8px;gap:6px}.pwdo{font-size:.9rem}.pwchip{font-size:.75rem;padding:2px 7px}.pwchip b{font-size:.85rem}.pwmark{width:28px;height:28px;font-size:.8rem}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  window.Pathway = {start};
})();
