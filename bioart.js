/* Shared SVG drawing helpers for organic-looking cells, membranes, and DNA.
   Every function returns an SVG markup string. Results are cached, since scenes re-render every frame. */
(function(){
  const f1 = v => (+v).toFixed(1);
  const cache = new Map();
  const memo = (key, make) => { if (!cache.has(key)){ if (cache.size > 400) cache.clear(); cache.set(key, make()); } return cache.get(key); };

  function rng(seed){ let s = (seed >>> 0) || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
  /* smooth, low-frequency wobble around a loop, 0..1 index */
  function wobbler(seed, amt){
    const r = rng(seed), ph = [r() * 6.28, r() * 6.28, r() * 6.28];
    return t => amt * (0.55 * Math.sin(2 * Math.PI * 2 * t + ph[0]) + 0.3 * Math.sin(2 * Math.PI * 3 * t + ph[1]) + 0.15 * Math.sin(2 * Math.PI * 5 * t + ph[2]));
  }

  /* Closed Catmull-Rom curve through the points */
  function smoothClosed(pts){
    const n = pts.length;
    let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
    for (let i = 0; i < n; i++){
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`;
    }
    return d + "Z";
  }
  function smoothOpen(pts){
    const n = pts.length;
    let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
    for (let i = 0; i < n - 1; i++){
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`;
    }
    return d;
  }

  /* Outline shapes (lists of points, clockwise on screen) */
  /* sq < 1 makes the shape squarer (rounded-rectangle-ish) so wide scenes keep usable corners */
  function blob(cx, cy, rx, ry, wob, seed, n, sq){
    n = n || 64; sq = sq || 1; const w = wobbler(seed, wob || 0.05), pts = [];
    const pw = (v) => Math.sign(v) * Math.pow(Math.abs(v), sq);
    for (let k = 0; k < n; k++){ const t = k / n, a = t * Math.PI * 2, s = 1 + w(t); pts.push([cx + rx * s * pw(Math.cos(a)), cy + ry * s * pw(Math.sin(a))]); }
    return pts;
  }
  /* Rod-shaped bacterium: straight sides with rounded ends, gently irregular */
  function capsule(cx, cy, rx, ry, wob, seed, n){
    n = n || 90; const w = wobbler(seed, wob || 0.04);
    const L = Math.max(0, rx - ry), per = 4 * L + 2 * Math.PI * ry, pts = [];
    for (let k = 0; k < n; k++){
      const t = k / n; let s = t * per, x, y, nx, ny;
      if (s < 2 * L){ x = cx - L + s; y = cy - ry; nx = 0; ny = -1; }
      else if ((s -= 2 * L) < Math.PI * ry){ const a = -Math.PI / 2 + s / ry; x = cx + L + ry * Math.cos(a); y = cy + ry * Math.sin(a); nx = Math.cos(a); ny = Math.sin(a); }
      else if ((s -= Math.PI * ry) < 2 * L){ x = cx + L - s; y = cy + ry; nx = 0; ny = 1; }
      else { s -= 2 * L; const a = Math.PI / 2 + s / ry; x = cx - L + ry * Math.cos(a); y = cy + ry * Math.sin(a); nx = Math.cos(a); ny = Math.sin(a); }
      const d = w(t) * ry; pts.push([x + nx * d, y + ny * d]);
    }
    return pts;
  }

  /* Evenly spaced samples along a closed outline, with outward normals */
  function resample(pts, step){
    const dense = [];
    const n = pts.length;
    for (let i = 0; i < n; i++){
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      for (let j = 0; j < 6; j++){
        const t = j / 6, t2 = t * t, t3 = t2 * t;
        const c = (a, b, cc, dd) => 0.5 * ((2 * b) + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - dd) * t2 + (-a + 3 * b - 3 * cc + dd) * t3);
        dense.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    let cx = 0, cy = 0; dense.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= dense.length; cy /= dense.length;
    const out = []; let carry = 0;
    for (let i = 0; i < dense.length; i++){
      const a = dense[i], b = dense[(i + 1) % dense.length];
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-6;
      let pos = carry;
      while (pos < seg){
        const u = pos / seg, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
        let nx = -(b[1] - a[1]) / seg, ny = (b[0] - a[0]) / seg;
        if ((x - cx) * nx + (y - cy) * ny < 0){ nx = -nx; ny = -ny; }
        out.push([x, y, nx, ny]);
        pos += step;
      }
      carry = pos - seg;
    }
    return out;
  }

  /* A phospholipid bilayer: pale tail band with a row of round heads on each face.
     o: {fill, head, tail, gap, r, step, outline} */
  function bilayer(pts, o, key){
    o = o || {};
    const k = key ? "bl:" + key + JSON.stringify(o) : null;
    const make = () => {
      const gap = o.gap || 5, r = o.r || 2.7, step = o.step || 8.5, head = o.head || "#b9a6ee", tail = o.tail || "#ece6fa";
      const d = smoothClosed(pts);
      let s = `<path d="${d}" fill="${o.fill || "#fbf9ff"}" stroke="${tail}" stroke-width="${2 * gap + 2}" stroke-linejoin="round"/>`;
      s += `<path d="${d}" fill="none" stroke="${head}" stroke-width="1" stroke-opacity=".35" stroke-dasharray="1.5 3"/>`;
      let h = "";
      resample(pts, step).forEach(p => {
        h += `M${f1(p[0] + p[2] * gap - r)},${f1(p[1] + p[3] * gap)}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
        h += `M${f1(p[0] - p[2] * gap - r)},${f1(p[1] - p[3] * gap)}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
      });
      return s + `<path d="${h}" fill="${head}"/>`;
    };
    return k ? memo(k, make) : make();
  }
  /* Plain organic outline (for things like a nucleus envelope or cell wall) */
  function outline(pts, fill, stroke, width, extra){ return `<path d="${smoothClosed(pts)}" fill="${fill}" stroke="${stroke}" stroke-width="${width || 3}" ${extra || ""}/>`; }
  /* Band that hugs a shape at a fixed distance outward (e.g. a cell wall around the membrane) */
  function grow(pts, by){
    let cx = 0, cy = 0; pts.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= pts.length; cy /= pts.length;
    const n = pts.length;
    return pts.map((p, i) => {
      const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
      if ((p[0] - cx) * nx + (p[1] - cy) * ny < 0){ nx = -nx; ny = -ny; }
      return [p[0] + nx * by, p[1] + ny * by];
    });
  }

  /* Double-helix DNA seen from the side, between x1 and x2 around y.
     o: {amp, per, col, back, rung, width, phase, colors} ; colors = array of rung colors to cycle through */
  function helix(x1, x2, y, o){
    o = o || {};
    const key = "hx:" + [f1(x1), f1(x2), f1(y), JSON.stringify(o)].join(",");
    return memo(key, () => {
      const amp = o.amp || 7, per = o.per || 36, col = o.col || "#0f766e", back = o.back || "#8fc7bf", w = o.width || 3;
      const ph = (o.phase || 0) * Math.PI * 2, off = 0.38 * Math.PI * 2;
      const yA = x => y + amp * Math.sin((x - x1) / per * Math.PI * 2 + ph);
      const yB = x => y + amp * Math.sin((x - x1) / per * Math.PI * 2 + ph + off);
      const front = x => Math.cos((x - x1) / per * Math.PI * 2 + ph) > 0;
      const segs = { A:[[], []], B:[[], []] };
      let rung = "";
      const rc = o.colors || ["#2f9e63", "#d9534f", "#f2b134", "#3b7dd8"];
      let ri = 0;
      for (let x = x1; x <= x2 + 0.01; x += per / 7){
        const a = yA(x), b = yB(x);
        if (Math.abs(a - b) > 2.5 && o.rung !== false) rung += `<path d="M${f1(x)},${f1(a)}V${f1(b)}" stroke="${rc[ri++ % rc.length]}" stroke-width="2" stroke-opacity=".55"/>`;
      }
      const step = 2;
      let dA = { f:"", b:"" }, dB = { f:"", b:"" }, lastA = null, lastB = null;
      for (let x = x1; x <= x2 + 0.01; x += step){
        const fa = front(x) ? "f" : "b", fb = front(x) ? "b" : "f";
        const ptA = `${f1(x)},${f1(yA(x))}`, ptB = `${f1(x)},${f1(yB(x))}`;
        dA[fa] += (lastA === fa ? "L" : "M") + ptA; lastA = fa;
        dB[fb] += (lastB === fb ? "L" : "M") + ptB; lastB = fb;
      }
      const line = (d, c, ww) => d ? `<path d="${d}" fill="none" stroke="${c}" stroke-width="${ww}" stroke-linecap="round" stroke-linejoin="round"/>` : "";
      return line(dA.b, back, w) + line(dB.b, back, w) + rung + line(dA.f, col, w) + line(dB.f, col, w);
    });
  }
  /* Circular double-stranded DNA (bacterial chromosome or plasmid) */
  function helixLoop(cx, cy, R, o){
    o = o || {};
    const key = "hl:" + [f1(cx), f1(cy), f1(R), JSON.stringify(o)].join(",");
    return memo(key, () => {
      const amp = o.amp || 5, turns = o.turns || Math.round(2 * Math.PI * R / 30), col = o.col || "#0f766e", back = o.back || "#8fc7bf", w = o.width || 2.5, ry = o.ry || R;
      const N = 360; let fA = "", bA = "", fB = "", bB = "", la = null, lb = null, rung = "";
      for (let k = 0; k <= N; k++){
        const t = k / N * Math.PI * 2, s = Math.sin(t * turns), c = Math.cos(t * turns);
        const ra = R + amp * s, rb = R - amp * s;
        const pa = `${f1(cx + ra * Math.cos(t))},${f1(cy + ra * (ry / R) * Math.sin(t))}`, pb = `${f1(cx + rb * Math.cos(t))},${f1(cy + rb * (ry / R) * Math.sin(t))}`;
        const fa = c > 0;
        if (fa){ fA += (la === "f" ? "L" : "M") + pa; la = "f"; bB += (lb === "b" ? "L" : "M") + pb; lb = "b"; }
        else { bA += (la === "b" ? "L" : "M") + pa; la = "b"; fB += (lb === "f" ? "L" : "M") + pb; lb = "f"; }
        if (o.rung !== false && k % 6 === 0 && Math.abs(s) > 0.35) rung += `<path d="M${pa}L${pb}" stroke="${["#2f9e63", "#d9534f", "#f2b134", "#3b7dd8"][(k / 6) % 4]}" stroke-width="1.6" stroke-opacity=".5"/>`;
      }
      const line = (d, c) => d ? `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>` : "";
      return line(bA, back) + line(bB, back) + rung + line(fA, col) + line(fB, col);
    });
  }
  /* A tangle of loose DNA (nucleoid / chromatin), drawn as a thin double strand along a wandering closed path */
  function tangle(cx, cy, rx, ry, seed, o){
    o = o || {};
    const key = "tg:" + [f1(cx), f1(cy), f1(rx), f1(ry), seed, JSON.stringify(o)].join(",");
    return memo(key, () => {
      /* two loose, overlapping coils of a looping strand, like a nucleoid spilling around */
      const r = rng(seed), n = o.n || 12, loops = o.loops || 3;
      let s = "";
      for (let L = 0; L < loops; L++){
        const pts = [], ox = (r() - 0.5) * rx * 0.5, oy = (r() - 0.5) * ry * 0.5;
        for (let k = 0; k < n; k++){ const a = k / n * Math.PI * 2, rr = 0.8 + 0.2 * r(); pts.push([cx + ox + rx * rr * Math.cos(a), cy + oy + ry * rr * Math.sin(a)]); }
        const d = smoothClosed(pts);
        s += `<path d="${d}" fill="none" stroke="${o.col || "#0f766e"}" stroke-width="${o.width || 3}" stroke-opacity="${o.op || 0.5}" stroke-linejoin="round"/>`
          + `<path d="${d}" fill="none" stroke="#fff" stroke-width="${(o.width || 3) * 0.4}" stroke-opacity="${o.op || 0.5}" stroke-dasharray="2.5 3.5"/>`;
      }
      return s;
    });
  }

  window.BioArt = { rng, smoothClosed, smoothOpen, blob, capsule, grow, bilayer, outline, helix, helixLoop, tangle, resample };
})();
