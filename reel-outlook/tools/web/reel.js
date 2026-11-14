/* Outlook outage reel, in the portfolio's visual language.
 * window.REEL (timeline from render_web.py) and window.ASSETS (portfolio SVGs) are injected before load.
 * Everything runs on one paused GSAP timeline; the recorder seeks it frame by frame. */
gsap.registerPlugin(DrawSVGPlugin, MotionPathPlugin);

const R = window.REEL;
const A = window.ASSETS;
const L = R.lang;
const T = (en, id) => (L === "id" ? id : en);
const tl = gsap.timeline({ paused: true });
const SVGNS = "http://www.w3.org/2000/svg";
const BLUE_BEATS = new Set([1, 3, 5]);

// ------------------------------------------------------------------ DOM helpers
function el(tag, cls, parent, css = {}, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  Object.assign(e.style, css);
  if (html !== undefined) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
const px = (v) => (typeof v === "number" ? v + "px" : v);
function box(e, x, y, w, h) {
  e.style.left = px(x);
  e.style.top = px(y);
  if (w !== undefined) e.style.width = px(w);
  if (h !== undefined) e.style.height = px(h);
  return e;
}
function svg(parent, x, y, w, h, vb, keepRatio) {
  const s = document.createElementNS(SVGNS, "svg");
  s.setAttribute("viewBox", vb);
  if (!keepRatio) s.setAttribute("preserveAspectRatio", "none");
  else s.dataset.prop = "1"; // proportional: strokes scale with it, so DrawSVG can measure them
  Object.assign(s.style, { position: "absolute", left: px(x), top: px(y), width: px(w), height: px(h) });
  parent.appendChild(s);
  return s;
}
function sv(parent, tag, attrs) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent.appendChild(e);
  return e;
}
function stroke(parent, d, color = "#fff", w = 12, extra = {}) {
  const prop = parent.dataset && parent.dataset.prop === "1";
  const attrs = { d, fill: "none", stroke: color, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round", ...extra };
  if (!prop) attrs["vector-effect"] = "non-scaling-stroke";
  return sv(parent, "path", attrs);
}
const parser = new DOMParser();
function assetPaths(name) {
  const doc = parser.parseFromString(A[name], "image/svg+xml");
  const root = doc.documentElement;
  return { vb: root.getAttribute("viewBox"), paths: [...doc.querySelectorAll("path")].map((p) => p.getAttribute("d")) };
}
function chip(parent, text, tone, x, y, css = {}) {
  const c = el("span", "chip " + tone, parent, css, text);
  if (x !== undefined) box(c, x, y);
  return c;
}

// ------------------------------------------------------------------ motion helpers (MOTION_SPEC tokens)
const rise = (e, t, y = 60, dur = 0.8) =>
  tl.fromTo(e, { y, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: dur, ease: "power4.out" }, t);
const pop = (e, t, dur = 0.45) =>
  tl.fromTo(e, { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: dur, ease: "back.out(1.6)" }, t);
const draw = (p, t, dur = 0.7) =>
  tl.fromTo(p, { drawSVG: "0%" }, { drawSVG: "100%", duration: dur, ease: "power2.inOut" }, t);
function spinFor(e, t, dur, degPerSec = 9) {
  tl.to(e, { rotation: `+=${degPerSec * dur}`, duration: dur, ease: "none" }, t);
}
function repeatsIn(span, cycle) {
  return Math.max(0, Math.floor(span / cycle) - 1);
}
function counter(t, dur, from, to, fmt, node, ease = "power1.inOut") {
  const o = { v: from };
  node.textContent = fmt(from);
  tl.to(o, { v: to, duration: dur, ease, onUpdate: () => (node.textContent = fmt(o.v)) }, t);
}

// ------------------------------------------------------------------ backgrounds, header, captions
const bgs = document.getElementById("bgs");
function beatStarts() {
  const s = [];
  R.scenes.forEach((sc, i) => {
    if (i === 0 || sc.beat !== R.scenes[i - 1].beat) s.push({ beat: sc.beat, t: sc.start });
  });
  return s;
}
const EDGE = 260;
function edgePath(b) {
  return `M0 ${EDGE} Q540 ${EDGE - b} 1080 ${EDGE} L1080 2400 L0 2400 Z`;
}
function buildBackgrounds() {
  const starts = beatStarts();
  starts.forEach((b, k) => {
    const color = BLUE_BEATS.has(b.beat) ? "var(--blue)" : "var(--navy)";
    const end = k + 1 < starts.length ? starts[k + 1].t : R.total;
    const wrap = el("div", "bg", bgs, { zIndex: k });
    const s = svg(wrap, 0, 0, 1080, 2400, "0 0 1080 2400");
    s.classList.add("edge");
    const path = sv(s, "path", { d: edgePath(0), fill: BLUE_BEATS.has(b.beat) ? "#0411ab" : "#010326" });
    // Section decor: starburst on blue (Projects), looping line on navy (hero)
    if (BLUE_BEATS.has(b.beat)) {
      const { vb, paths } = assetPaths("starburst");
      const bs = svg(wrap, 620, EDGE + 110, 520, 520, vb);
      paths.forEach((d) => sv(bs, "path", { d, fill: "#1b3cff" }));
      tl.fromTo(bs, { yPercent: 60, scale: 0.6, rotation: -30 }, { yPercent: 0, scale: 1, rotation: 0, duration: 1.2, ease: "power4.out" }, b.t + 0.2);
      spinFor(bs, b.t + 1.4, Math.max(0.5, end - b.t), 9);
    } else {
      // hero's bottom-left swoosh, drawn on as the section arrives
      const { vb, paths } = assetPaths("swoosh");
      const ss = svg(wrap, -30, EDGE + 1600, 560, 310, vb);
      paths.forEach((d) => draw(stroke(ss, d, "#fff", 9), (k ? b.t + 0.5 : 0.3), 1.4));
    }
    if (k === 0) {
      gsap.set(wrap, { y: -EDGE });
      return;
    }
    gsap.set(wrap, { y: 1920 });
    const o = { b: 220 };
    tl.to(wrap, { y: -EDGE, duration: 0.95, ease: "power3.inOut" }, b.t - 0.15);
    tl.fromTo(o, { b: 220 }, { b: 0, duration: 0.95, ease: "power2.out", onUpdate: () => path.setAttribute("d", edgePath(o.b)) }, b.t - 0.15);
  });
}

function buildHeader() {
  const logo = document.getElementById("logo");
  logo.innerHTML = A.logo;
  const s = logo.querySelector("svg");
  s.style.width = "100%";
  s.style.height = "100%";
  const pill = document.getElementById("pill");
  const starts = beatStarts();
  const labels = starts.map((b) => el("span", "lab", pill, {}, R.beats[b.beat]));
  const widths = labels.map((x) => x.offsetWidth);
  starts.forEach((b, k) => {
    const lab = labels[k];
    gsap.set(lab, { autoAlpha: 0 });
    tl.fromTo(lab, { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.4, ease: "power4.out" }, b.t + (k ? 0.1 : 0.2));
    if (k + 1 < starts.length) tl.to(lab, { yPercent: -60, autoAlpha: 0, duration: 0.25, ease: "power2.in" }, starts[k + 1].t - 0.15);
    tl.to(pill, { width: widths[k] + 28, duration: 0.4, ease: "power3.inOut" }, b.t - (k ? 0.1 : 0));
  });
  gsap.set(pill, { width: widths[0] + 28 });
  tl.fromTo([logo, pill], { y: -40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: "power4.out", stagger: 0.1 }, 0);
}

function buildCaptions() {
  const host = document.getElementById("caps");
  R.caps.forEach(([a, b, text]) => {
    const c = el("div", "cap", host, {}, text);
    tl.fromTo(c, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.18, ease: "power2.out" }, a);
    tl.set(c, { opacity: 0 }, b);
  });
}

// ------------------------------------------------------------------ headlines (E7 line reveal + highlight / underline)
function buildHead(sc, i) {
  const host = el("div", "head", document.getElementById("heads"));
  gsap.set(host, { autoAlpha: 0 });
  tl.set(host, { autoAlpha: 1 }, sc.start);
  if (i + 1 < R.scenes.length) tl.set(host, { autoAlpha: 0 }, R.scenes[i + 1].start + 0.4);
  if (sc.num) {
    const n = el("div", "num", host, {}, sc.num);
    const m = el("div", "", null, { overflow: "hidden" });
    host.insertBefore(m, n);
    m.appendChild(n);
    tl.fromTo(n, { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: "power4.out" }, sc.start + 0.05);
    if (i + 1 < R.scenes.length) tl.to(n, { yPercent: -110, duration: 0.35, ease: "power3.in" }, sc.end - 0.3);
  }
  const box_ = el("div", "htext", host);
  // units: words, with *key phrase* kept together
  const parts = sc.head.split(/(\*[^*]+\*)/).filter(Boolean);
  const units = [];
  parts.forEach((p) => {
    if (p.startsWith("*")) {
      const k = el("span", "key", box_, {}, p.slice(1, -1));
      units.push(k);
      box_.appendChild(document.createTextNode(" "));
    } else {
      p.split(/\s+/).filter(Boolean).forEach((w) => {
        if (/^[.?!,]$/.test(w) && units.length) {
          units[units.length - 1].insertAdjacentText("beforeend", w);
          return;
        }
        units.push(el("span", "", box_, { display: "inline-block" }, w));
        box_.appendChild(document.createTextNode(" "));
      });
    }
  });
  // trailing punctuation right after a key ("down." / "Google?")
  // group units into lines by their offsetTop, then mask each line
  const rows = [];
  units.forEach((u) => {
    const top = u.offsetTop;
    let row = rows.find((r) => Math.abs(r.top - top) < 10);
    if (!row) rows.push((row = { top, items: [] }));
    row.items.push(u);
  });
  box_.innerHTML = "";
  const inners = [];
  rows.forEach((r) => {
    const mask = el("div", "", box_, { overflow: "hidden", padding: "0 0.25em 0.32em 0.25em", margin: "0 -0.25em -0.32em -0.25em" });
    const inner = el("div", "", mask);
    r.items.forEach((u, j) => {
      inner.appendChild(u);
      if (j < r.items.length - 1) inner.appendChild(document.createTextNode(" "));
    });
    inners.push(inner);
  });
  if (i === 0) {
    // E1 headline assemble (hero): lines start spread apart and settle into the layout
    inners.forEach((x) => (x.parentNode.style.overflow = "visible"));
    tl.fromTo(inners, { x: (j) => (j % 2 ? 190 : -170), y: (j) => j * 70, autoAlpha: 0 },
      { x: 0, y: 0, autoAlpha: 1, duration: 1.6, ease: "power4.out", stagger: 0.12 }, sc.start + 0.05);
  } else {
    tl.fromTo(inners, { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: "power4.out", stagger: 0.12 }, sc.start + 0.08);
  }
  if (i + 1 < R.scenes.length) tl.to(inners, { yPercent: -115, duration: 0.35, ease: "power3.in", stagger: 0.05 }, sc.end - 0.32);
  const key = box_.querySelector(".key");
  if (key) {
    const tKey = sc.start + 0.08 + 0.8 * 0.6 + 0.12 * Math.max(0, inners.findIndex((x) => x.contains(key)));
    if (BLUE_BEATS.has(sc.beat)) {
      const hl = el("span", "hl", key);
      tl.fromTo(hl, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power4.out" }, tKey + 0.1);
    } else {
      const { vb, paths } = assetPaths("underline");
      const u = document.createElementNS(SVGNS, "svg");
      u.setAttribute("viewBox", vb);
      u.setAttribute("preserveAspectRatio", "none");
      u.classList.add("ul");
      key.appendChild(u);
      paths.forEach((d) => draw(stroke(u, d, "#E5F0FF", 13), tKey + 0.1, 0.55));
    }
  }
}

// ------------------------------------------------------------------ scene stage helpers
function stageFor(sc, i, opts = {}) {
  const st = el("div", "stage", document.getElementById("stages"));
  gsap.set(st, { autoAlpha: 0 });
  tl.set(st, { autoAlpha: 1 }, sc.start);
  const next = R.scenes[i + 1];
  if (next) {
    if (opts.cut) tl.set(st, { autoAlpha: 0 }, next.start);
    else tl.to(st, { autoAlpha: 0, y: -50, duration: 0.32, ease: "power2.in" }, sc.end - 0.3);
  }
  return st;
}
function card(parent, x, y, w, h, css = {}) {
  return box(el("div", "lcard", parent, css), x, y, w, h);
}
function disc(parent, x, y, size, color = "var(--m500)") {
  return box(el("div", "disc", parent, { background: color }), x, y, size, size);
}
function bar(parent, x, y, w, h, color) {
  return box(el("div", "bar", parent, { background: color }), x, y, w, h);
}
function rnd(seed) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

// ------------------------------------------------------------------ scenes
const S = {};

S.inbox = (st, sc, d) => {
  const t0 = sc.start;
  const c = box(el("div", "pcard", st, { background: "var(--m50)" }), 270, 30, 520, 600);
  gsap.set(c, { rotation: -8 });
  tl.fromTo(c, { y: 80, rotation: -16, autoAlpha: 0 }, { y: 0, rotation: -8, autoAlpha: 1, duration: 0.9, ease: "power4.out" }, t0);
  const top = el("div", "", c, { position: "absolute", left: 0, top: 0, width: "100%", height: "86px", background: "var(--m100)" });
  [0, 1, 2].forEach((k) => disc(top, 34 + k * 36, 32, 22, "var(--m200)"));
  const rows = [];
  for (let k = 0; k < 5; k++) {
    const r = el("div", "", c, { position: "absolute", left: 0, top: 116 + k * 92 + "px", width: "100%", height: "80px" });
    disc(r, 36, 10, 58, "var(--m400)");
    bar(r, 118, 14, 300, 20, "var(--m200)");
    bar(r, 118, 48, 210, 16, "var(--m100)");
    rows.push(r);
  }
  tl.to(rows, { x: 160, autoAlpha: 0, duration: 0.45, ease: "power3.in", stagger: 0.16 }, t0 + 0.9);
  const sp = svg(c, 205, 245, 110, 110, "0 0 110 110");
  sv(sp, "circle", { cx: 55, cy: 55, r: 42, fill: "none", stroke: "#abcbff", "stroke-width": 12 });
  const arc = sv(sp, "circle", { cx: 55, cy: 55, r: 42, fill: "none", stroke: "#1b3cff", "stroke-width": 12, "stroke-linecap": "round", "stroke-dasharray": "80 300" });
  gsap.set(sp, { autoAlpha: 0 });
  tl.to(sp, { autoAlpha: 1, duration: 0.3 }, t0 + 1.8);
  tl.to(arc, { rotation: 360 * Math.max(1, Math.round(d)), svgOrigin: "55 55", duration: Math.max(0.5, d - 1.8), ease: "none" }, t0 + 1.8);
  const off = chip(st, T("Offline", "Offline"), "olive", 690, 0);
  gsap.set(off, { rotation: 12 });
  pop(off, t0 + 1.9);
  const clk = chip(st, "", "light chillax", 70, 520, { fontSize: "48px", fontFamily: "Chillax", fontWeight: 600 });
  gsap.set(clk, { rotation: -10 });
  pop(clk, t0 + 0.5);
  counter(t0 + 0.6, Math.max(0.6, d - 1.0), 0, 24, (v) => `${Math.round(v)}h`, clk);
  const ar = assetPaths("arrow");
  const as = svg(st, 70, 150, 180, 122, ar.vb);
  ar.paths.forEach((p) => draw(stroke(as, p, "#fff", 12), t0 + 0.4));
  const s20 = assetPaths("spark20");
  const ss = svg(st, 840, 420, 64, 80, s20.vb);
  s20.paths.forEach((p) => draw(stroke(ss, p, "#fff", 10), t0 + 0.7, 0.5));
  const s21 = assetPaths("spark21");
  const ss2 = svg(st, 880, 380, 44, 58, s21.vb);
  s21.paths.forEach((p) => draw(stroke(ss2, p, "#fff", 10), t0 + 0.8, 0.5));
};

S.nohack = (st, sc, d) => {
  const t0 = sc.start;
  const sb = assetPaths("starburst");
  const bs = svg(st, 300, 70, 480, 480, sb.vb);
  sb.paths.forEach((p) => sv(bs, "path", { d: p, fill: "#fff" }));
  tl.fromTo(bs, { yPercent: 60, scale: 0.6, rotation: -30, autoAlpha: 0 }, { yPercent: 0, scale: 1, rotation: 0, autoAlpha: 1, duration: 1.0, ease: "power4.out" }, t0);
  spinFor(bs, t0 + 1.0, d, 12);
  const dc = disc(st, 390, 160, 300);
  pop(dc, t0 + 0.25, 0.6);
  const lk = svg(dc, 60, 55, 180, 180, "0 0 100 100", true);
  const lockPaths = [
    "M22 46 H78 A8 8 0 0 1 86 54 V82 A8 8 0 0 1 78 90 H22 A8 8 0 0 1 14 82 V54 A8 8 0 0 1 22 46 Z",
    "M33 46 V33 A17 17 0 0 1 67 33 V46",
    "M50 62 V74",
  ];
  lockPaths.forEach((p, k) => draw(stroke(lk, p, "#fff", 7), t0 + 0.6 + k * 0.15, 0.6));
  const c1 = chip(st, T("No sign of a cyberattack", "Tidak ada tanda serangan siber"), "light", 60, 20);
  gsap.set(c1, { rotation: -5 });
  pop(c1, t0 + 0.9);
  const c2 = chip(st, "Microsoft", "teal", 700, 540);
  gsap.set(c2, { rotation: 8 });
  pop(c2, t0 + 1.2);
  const tv = assetPaths("tickV");
  const tvs = svg(st, 300, 470, 30, 76, tv.vb);
  gsap.set(tvs, { rotation: -30 });
  tv.paths.forEach((p) => draw(stroke(tvs, p, "#fff", 10), t0 + 1.3, 0.4));
};

const GRID = { xs: [60, 390, 720], ys: [290, 480], w: 300, h: 160 };
function serverCard(st, k) {
  const x = GRID.xs[k % 3], y = GRID.ys[Math.floor(k / 3)];
  const c = card(st, x, y, GRID.w, GRID.h, { borderRadius: "40px" });
  const bars = [bar(c, 34, 34, 150, 18, "var(--m200)"), bar(c, 34, 68, 110, 18, "var(--m200)"), bar(c, 34, 102, 130, 14, "var(--m200)")];
  const dot = disc(c, 222, 58, 40);
  const load = bar(c, 34, 128, 0, 12, "var(--m400)");
  return { c, bars, dot, load, x, y };
}
function failCard(s, t, k, st, instant) {
  const dur = instant ? 0 : 0.35;
  tl.to(s.c, { backgroundColor: "#010326", y: 14, rotation: k % 2 ? 3 : -3, boxShadow: "inset 0 0 0 5px #edf0f7", duration: dur, ease: "power3.out" }, t);
  tl.to(s.bars, { backgroundColor: "#1b212c", duration: dur }, t);
  tl.to(s.dot, { backgroundColor: "#705801", duration: dur }, t);
  tl.to(s.load, { autoAlpha: 0, duration: dur }, t);
  const ch = chip(st, "Offline", "olive", s.x + 150, s.y - 34, { height: "70px", fontSize: "28px", padding: "0 26px" });
  gsap.set(ch, { rotation: k % 2 ? 8 : -8 });
  if (instant) tl.set(ch, { autoAlpha: 1 }, t);
  else pop(ch, t + 0.1);
  if (instant) gsap.set(ch, { autoAlpha: 0 });
}
function dateCard(st, t0, animate) {
  const c = card(st, 60, 0, 250, 250, { borderRadius: "56px" });
  const n = el("div", "chillax", c, { position: "absolute", left: 0, right: 0, top: "28px", textAlign: "center", fontSize: "140px", lineHeight: "1", color: "var(--navy)" }, "12");
  el("div", "", c, { position: "absolute", left: 0, right: 0, bottom: "30px", textAlign: "center", font: "700 40px/1 Inter, sans-serif", color: "var(--m500)" }, T("NOV", "NOV"));
  if (animate) {
    rise(c, t0);
    counter(t0 + 0.2, 0.7, 9, 12, (v) => String(Math.round(v)), n, "power2.out");
  }
  return c;
}
const FIRST = [4, 1, 5];
const REST = [0, 2, 3];

S.servers = (st, sc, d) => {
  const t0 = sc.start;
  dateCard(st, t0, true);
  const cards = [0, 1, 2, 3, 4, 5].map((k) => serverCard(st, k));
  cards.forEach((s, k) => rise(s.c, t0 + 0.45 + k * 0.08));
  const lab = chip(st, T("Health check", "Pengecekan"), "light", 360, 70);
  pop(lab, t0 + 0.8);
  const scan = el("div", "", st, { position: "absolute", left: "40px", top: "270px", width: "1000px", height: "8px", borderRadius: "8px", background: "#fff", boxShadow: "0 0 30px 6px rgba(229,240,255,.8)" });
  gsap.set(scan, { autoAlpha: 0 });
  const cyc = 1.1;
  tl.fromTo(scan, { y: 0, autoAlpha: 1 }, { y: 400, duration: cyc, ease: "sine.inOut", repeat: repeatsIn(d - 1.3, cyc), yoyo: true }, t0 + 1.2);
  const span = Math.max(1.2, d - 2.0);
  FIRST.forEach((k, j) => failCard(cards[k], t0 + 1.6 + j * span / 3, j, st));
};

S.overload = (st, sc, d) => {
  const t0 = sc.start;
  dateCard(st, t0, false);
  const cards = [0, 1, 2, 3, 4, 5].map((k) => serverCard(st, k));
  FIRST.forEach((k, j) => failCard(cards[k], t0, j, st, true));
  const ar = assetPaths("arrow");
  for (let j = 0; j < 5; j++) {
    const a = svg(st, 360 + j * 120, 40 + (j % 2) * 60, 120, 82, ar.vb);
    gsap.set(a, { rotation: 40 });
    ar.paths.forEach((p) => {
      const path = stroke(a, p, "#fff", 10);
      tl.fromTo(path, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.45, ease: "power2.out", repeat: repeatsIn(d, 0.75), repeatDelay: 0.3 }, t0 + 0.1 + j * 0.13);
    });
  }
  const failAt = REST.map((_, j) => t0 + d * 0.38 + j * d * 0.16);
  REST.forEach((k, j) => {
    const s = cards[k];
    tl.fromTo(s.load, { width: 0 }, { width: 230, duration: failAt[j] - t0, ease: "power1.in" }, t0);
    tl.to(s.load, { backgroundColor: "#705801", duration: 0.3 }, failAt[j] - 0.5);
    const shakes = Math.max(2, Math.floor((failAt[j] - t0 - 0.3) / 0.06));
    tl.fromTo(s.c, { x: -4 }, { x: 4, duration: 0.06, repeat: shakes, yoyo: true, ease: "none" }, t0 + 0.3);
    tl.set(s.c, { x: 0 }, failAt[j]);
    failCard(s, failAt[j], j + 1, st);
  });
};

S.globe = (st, sc, d) => {
  const t0 = sc.start;
  const g = disc(st, 270, 60, 540);
  pop(g, t0, 0.7);
  const s = svg(g, 0, 0, 540, 540, "0 0 540 540", true);
  sv(s, "circle", { cx: 270, cy: 270, r: 262, fill: "none", stroke: "#fff", "stroke-width": 8 });
  [-0.62, -0.31, 0, 0.31, 0.62].forEach((lat) => {
    const y = 270 + lat * 262, hw = 262 * Math.sqrt(1 - lat * lat);
    sv(s, "line", { x1: 270 - hw, y1: y, x2: 270 + hw, y2: y, stroke: "#abcbff", "stroke-width": 5, "stroke-linecap": "round" });
  });
  for (let k = 0; k < 4; k++) {
    const e = sv(s, "ellipse", { cx: 270, cy: 270, rx: 262, ry: 262, fill: "none", stroke: "#abcbff", "stroke-width": 5 });
    gsap.set(e, { scaleX: Math.cos((k * Math.PI) / 4), svgOrigin: "270 270" });
    tl.fromTo(e, { scaleX: Math.abs(Math.cos((k * Math.PI) / 4)) }, { scaleX: 0.02, duration: 1.3, repeat: repeatsIn(d, 1.3), yoyo: true, ease: "sine.inOut", svgOrigin: "270 270" }, t0 + 0.2 + k * 0.32);
  }
  const r = rnd(7);
  for (let j = 0; j < 11; j++) {
    const a = r() * Math.PI * 2, rr = 240 * Math.sqrt(0.05 + r() * 0.8);
    const x = 270 + Math.cos(a) * rr, y = 270 + Math.sin(a) * rr;
    const at = t0 + 0.6 + j * 0.17;
    const ring = sv(s, "circle", { cx: x, cy: y, r: 14, fill: "none", stroke: "#fff", "stroke-width": 4 });
    const dot = sv(s, "circle", { cx: x, cy: y, r: 13, fill: "#fff" });
    gsap.set([ring, dot], { autoAlpha: 0 });
    tl.fromTo(dot, { scale: 0, autoAlpha: 0, svgOrigin: `${x} ${y}` }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: "back.out(2)", svgOrigin: `${x} ${y}` }, at);
    tl.fromTo(ring, { scale: 1, autoAlpha: 1, svgOrigin: `${x} ${y}` }, { scale: 3.2, autoAlpha: 0, duration: 1.1, repeat: repeatsIn(d - (at - t0), 1.1), ease: "power2.out", svgOrigin: `${x} ${y}` }, at);
  }
  const o = chip(st, "Outlook", "light", 30, 150);
  gsap.set(o, { rotation: -8 });
  tl.fromTo(o, { x: -200, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.7, ease: "power4.out" }, t0 + 0.4);
  const od = chip(st, T("Down", "Lumpuh"), "olive", 130, 250, { height: "76px", fontSize: "30px", padding: "0 28px" });
  gsap.set(od, { rotation: 6 });
  pop(od, t0 + 0.9);
  const tm = chip(st, "Teams", "light", 800, 420);
  gsap.set(tm, { rotation: 7 });
  tl.fromTo(tm, { x: 200, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.7, ease: "power4.out" }, t0 + 0.6);
  const td = chip(st, T("Down", "Lumpuh"), "olive", 820, 520, { height: "76px", fontSize: "30px", padding: "0 28px" });
  gsap.set(td, { rotation: -6 });
  pop(td, t0 + 1.1);
};

S.cause = (st, sc, d) => {
  const t0 = sc.start;
  const doc = card(st, 90, 40, 440, 580, { background: "var(--m50)", borderRadius: "48px" });
  gsap.set(doc, { rotation: -5 });
  tl.fromTo(doc, { y: 80, rotation: -12, autoAlpha: 0 }, { y: 0, rotation: -5, autoAlpha: 1, duration: 0.9, ease: "power4.out" }, t0);
  const ws = [300, 250, 330, 280, 220, 310, 260, 200, 240];
  ws.forEach((w, k) => {
    const red = k === 2 || k === 3 || k === 6;
    bar(doc, 50, 60 + k * 54, w, 22, "var(--m200)");
    if (red) {
      const r = bar(doc, 50, 56 + k * 54, w, 30, "var(--navy)");
      r.style.transformOrigin = "left center";
      tl.fromTo(r, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power4.out" }, t0 + 0.5 + k * 0.08);
    }
  });
  const q = el("div", "chillax", st, { position: "absolute", left: "640px", top: "30px", fontSize: "420px", lineHeight: "1", color: "#fff" }, "?");
  pop(q, t0 + 0.4, 0.6);
  tl.to(q, { y: -24, duration: 0.9, repeat: repeatsIn(d, 0.9), yoyo: true, ease: "sine.inOut" }, t0 + 1.0);
  const m = svg(st, 160, 150, 250, 250, "0 0 250 250", true);
  sv(m, "circle", { cx: 100, cy: 100, r: 80, fill: "rgba(229,240,255,.25)" });
  sv(m, "circle", { cx: 100, cy: 100, r: 80, fill: "none", stroke: "#fff", "stroke-width": 18 });
  sv(m, "line", { x1: 160, y1: 160, x2: 230, y2: 230, stroke: "#fff", "stroke-width": 28, "stroke-linecap": "round" });
  pop(m, t0 + 0.3);
  tl.to(m, { x: 160, duration: 1.5, repeat: repeatsIn(d, 1.5), yoyo: true, ease: "sine.inOut" }, t0 + 0.6);
  tl.to(m, { y: 170, duration: 1.05, repeat: repeatsIn(d, 1.05), yoyo: true, ease: "sine.inOut" }, t0 + 0.6);
};

S.status = (st, sc, d) => {
  const t0 = sc.start;
  const b = card(st, 60, 10, 960, 620, { borderRadius: "56px" });
  rise(b, t0);
  [0, 1, 2].forEach((k) => disc(b, 40 + k * 38, 36, 24, "var(--m200)"));
  bar(b, 170, 26, 560, 46, "var(--m50)");
  const rf = svg(b, 860, 22, 56, 56, "0 0 56 56", true);
  stroke(rf, "M44 28 A16 16 0 1 1 38 15.5", "#010326", 6);
  stroke(rf, "M39 6 L39 16 L29 16", "#010326", 6);
  const names = ["Exchange Online", "Outlook.com", "Teams", "SharePoint"];
  const states = [["olive", T("Degraded", "Terganggu")], ["olive", T("Degraded", "Terganggu")], ["teal", T("Investigating", "Diselidiki")], ["blue", T("Healthy", "Normal")]];
  const rows = names.map((n, k) => {
    const r = box(el("div", "", b, { position: "absolute", background: "var(--m50)", borderRadius: "30px" }), 40, 116 + k * 118, 880, 98);
    el("div", "", r, { position: "absolute", left: "36px", top: "28px", font: "600 40px/1 Cabin, sans-serif", color: "var(--navy)" }, n);
    const c = chip(r, states[k][1], states[k][0], undefined, undefined, { right: "18px", top: "14px", height: "70px", fontSize: "28px", padding: "0 26px" });
    c.style.position = "absolute";
    return r;
  });
  rows.forEach((r, k) => rise(r, t0 + 0.25 + k * 0.1, 40, 0.7));
  const cur = svg(st, 0, 0, 60, 80, "0 0 60 80", true);
  sv(cur, "path", { d: "M4 4 L4 64 L19 50 L30 74 L41 69 L30 46 L50 46 Z", fill: "#fff", stroke: "#010326", "stroke-width": 5, "stroke-linejoin": "round" });
  tl.fromTo(cur, { x: 980, y: 700, autoAlpha: 0 }, { x: 900, y: 50, autoAlpha: 1, duration: 0.9, ease: "power3.inOut" }, t0 + 0.4);
  const click = t0 + 1.35;
  tl.to(cur, { scale: 0.85, duration: 0.08, yoyo: true, repeat: 1 }, click);
  const ring = disc(st, 948, 60, 60, "transparent");
  ring.style.border = "6px solid #1b3cff";
  gsap.set(ring, { autoAlpha: 0 });
  tl.fromTo(ring, { scale: 0.6, autoAlpha: 1 }, { scale: 2.4, autoAlpha: 0, duration: 0.6, ease: "power2.out" }, click);
  tl.to(rf, { rotation: 360, duration: 0.7, ease: "power3.inOut", transformOrigin: "50% 50%" }, click);
  tl.fromTo(rows, { backgroundColor: "#e5f0ff" }, { backgroundColor: "#abcbff", duration: 0.15, yoyo: true, repeat: 1, stagger: 0.07 }, click + 0.15);
  const hi = box(el("div", "", b, { position: "absolute", border: "6px solid #1b3cff", borderRadius: "36px" }), 30, 106, 900, 118);
  pop(hi, click + 0.7);
};

S.late = (st, sc, d) => {
  const t0 = sc.start;
  const sw = assetPaths("swoosh");
  const s = svg(st, 60, 60, 900, 500, sw.vb);
  const p = stroke(s, sw.paths[0], "rgba(229,240,255,.45)", 10, { "stroke-dasharray": "2 26" });
  const guide = stroke(s, sw.paths[0], "rgba(0,0,0,0)", 1);
  tl.fromTo(p, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, t0);
  const env = el("div", "", st, { position: "absolute", left: 0, top: 0, width: "200px", height: "140px" });
  const es = svg(env, 0, 0, 200, 140, "0 0 200 140", true);
  sv(es, "rect", { x: 10, y: 10, width: 180, height: 120, rx: 22, fill: "#010326", stroke: "#fff", "stroke-width": 10 });
  stroke(es, "M24 26 L100 82 L176 26", "#fff", 10);
  const dl = chip(env, T("Delayed", "Tertunda"), "olive", 120, -40, { height: "70px", fontSize: "28px", padding: "0 24px" });
  gsap.set(dl, { rotation: 8 });
  tl.fromTo(env, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, t0 + 0.2);
  tl.to(env, { motionPath: { path: guide, align: guide, alignOrigin: [0.5, 0.5], start: 0.98, end: 0.25 }, duration: Math.max(1, d - 0.4), ease: "sine.inOut" }, t0 + 0.2);
  tl.to(env, { rotation: 4, duration: 0.6, repeat: repeatsIn(d, 0.6), yoyo: true, ease: "sine.inOut" }, t0 + 0.2);
  pop(dl, t0 + 0.6);
  const clk = chip(st, "", "light", 620, 540, { fontFamily: "Chillax", fontWeight: 600, fontSize: "46px" });
  gsap.set(clk, { rotation: -6 });
  pop(clk, t0 + 0.4);
  counter(t0 + 0.5, Math.max(0.8, d - 0.8), 9 * 60, 11 * 60 + 40, (v) => {
    const m = Math.round(v);
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  }, clk);
};

S.call = (st, sc, d) => {
  const t0 = sc.start;
  const dc = disc(st, 110, 170, 300);
  pop(dc, t0, 0.6);
  for (let k = 0; k < 3; k++) {
    const r = disc(st, 110, 170, 300, "transparent");
    r.style.border = "6px solid #fff";
    gsap.set(r, { autoAlpha: 0 });
    tl.fromTo(r, { scale: 1, autoAlpha: 0.9 }, { scale: 1.9, autoAlpha: 0, duration: 1.3, repeat: repeatsIn(d - 0.3, 1.3), ease: "power2.out" }, t0 + 0.3 + k * 0.43);
  }
  dc.innerHTML = A.phone;
  const ps = dc.querySelector("svg");
  Object.assign(ps.style, { position: "absolute", left: "75px", top: "75px", width: "150px", height: "150px" });
  ps.querySelectorAll("path").forEach((p) => {
    p.setAttribute("stroke", "#fff");
    p.setAttribute("stroke-width", "1.8");
  });
  tl.fromTo(ps, { rotation: -10 }, { rotation: 10, duration: 0.07, repeat: repeatsIn(d, 0.07), yoyo: true, ease: "none", transformOrigin: "50% 50%" }, t0 + 0.4);
  const msgs = [
    [T("Outlook is down.", "Outlook lagi mati."), "#fff", "var(--navy)"],
    [T("Calling you now.", "Saya telepon sekarang."), "var(--m500)", "#fff"],
    [T("Got it, thanks!", "Oke, makasih!"), "#fff", "var(--navy)"],
  ];
  msgs.forEach(([m, bg, fg], k) => {
    const b = el("div", "", st, { position: "absolute", left: k === 1 ? "520px" : "480px", top: 60 + k * 190 + "px", padding: "34px 44px",
      background: bg, color: fg, borderRadius: k === 1 ? "48px 48px 12px 48px" : "48px 48px 48px 12px", font: "600 44px/1.1 Cabin, sans-serif", whiteSpace: "nowrap" }, m);
    tl.fromTo(b, { x: 120, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.6, ease: "power4.out" }, t0 + 0.5 + k * 0.6);
  });
};

function cloudDoodle(parent, x, y, w, color) {
  const s = svg(parent, x, y, w, w * 0.62, "0 0 200 124", true);
  return stroke(s, "M50 112 H156 A38 38 0 0 0 150 37 A52 52 0 0 0 52 46 A34 34 0 0 0 50 112 Z", color, 10);
}

S.switch = (st, sc, d) => {
  const t0 = sc.start;
  const lc = card(st, 60, 150, 400, 360, { borderRadius: "56px" });
  const rc = card(st, 620, 150, 400, 360, { borderRadius: "56px" });
  rise(lc, t0);
  rise(rc, t0 + 0.12);
  chip(lc, "Microsoft 365", "blue", 30, 30, { height: "76px", fontSize: "30px", padding: "0 28px" });
  chip(rc, "Google Workspace", "blue", 30, 30, { height: "76px", fontSize: "30px", padding: "0 28px" });
  draw(cloudDoodle(lc, 100, 160, 200, "#010326"), t0 + 0.4);
  draw(cloudDoodle(rc, 100, 160, 200, "#010326"), t0 + 0.5);
  const s = svg(st, 0, 0, 1080, 680, "0 0 1080 680", true);
  const arc = stroke(s, "M300 200 Q540 -60 780 200", "#fff", 8, { "stroke-dasharray": "3 24" });
  const guide = stroke(s, "M300 200 Q540 -60 780 200", "rgba(0,0,0,0)", 1);
  tl.fromTo(arc, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, t0 + 0.5);
  const bx = el("div", "", st, { position: "absolute", left: 0, top: 0, width: "96px", height: "96px", borderRadius: "20px", background: "var(--navy)", border: "5px solid #fff" });
  el("div", "", bx, { position: "absolute", left: "38px", top: 0, width: "10px", height: "100%", background: "#fff" });
  gsap.set(bx, { autoAlpha: 0 });
  tl.set(bx, { autoAlpha: 1 }, t0 + 0.6);
  tl.to(bx, { motionPath: { path: guide, align: guide, alignOrigin: [0.5, 0.5] }, duration: 1.4, repeat: repeatsIn(d - 0.6, 1.4), ease: "power1.inOut" }, t0 + 0.6);
  const q = el("div", "chillax", st, { position: "absolute", left: "500px", top: "-60px", fontSize: "150px", lineHeight: "1", color: "#fff" }, "?");
  pop(q, t0 + 0.3);
};

S.costly = (st, sc, d) => {
  const t0 = sc.start;
  const gc = card(st, 60, 60, 420, 340, { borderRadius: "56px" });
  chip(gc, "Google Workspace", "blue", 30, 30, { height: "76px", fontSize: "30px", padding: "0 28px" });
  draw(cloudDoodle(gc, 110, 150, 200, "#010326"), t0 + 0.1, 0.4);
  rise(gc, t0, 40, 0.5);
  const dn = chip(st, T("Down too", "Bisa down juga"), "olive", 250, 10);
  gsap.set(dn, { rotation: -8 });
  pop(dn, t0 + 0.35);
  tl.fromTo(gc, { x: -8 }, { x: 8, duration: 0.05, repeat: 9, yoyo: true, ease: "none" }, t0 + 0.4);
  tl.set(gc, { x: 0 }, t0 + 0.9);
  const hs = [130, 220, 320, 440];
  hs.forEach((h, k) => {
    const b = box(el("div", "", st, { position: "absolute", background: "var(--m100)", borderRadius: "26px", transformOrigin: "50% 100%" }), 600 + k * 105, 620 - h, 80, h);
    tl.fromTo(b, { scaleY: 0 }, { scaleY: 1, duration: 0.7, ease: "power4.out" }, t0 + 0.8 + k * 0.18);
  });
  const lab = chip(st, T("Migration cost", "Biaya migrasi"), "light", 560, 60);
  pop(lab, t0 + 1.3);
  const money = el("div", "chillax", st, { position: "absolute", left: "120px", top: "440px", fontSize: "150px", lineHeight: "1", color: "#fff", letterSpacing: "0.02em" }, "");
  counter(t0 + 1.0, Math.max(0.6, d - 1.6), 0, 3, (v) => "$".repeat(Math.round(v)), money, "none");
};

S.scale = (st, sc, d) => {
  const t0 = sc.start;
  const big = box(el("div", "", st, { position: "absolute", background: "var(--navy)", border: "5px solid #edf0f7", borderRadius: "36px", transformOrigin: "50% 100%" }), 170, 60, 280, 480);
  const small = box(el("div", "", st, { position: "absolute", background: "#fff", borderRadius: "36px", transformOrigin: "50% 100%" }), 630, 400, 280, 140);
  tl.fromTo(big, { scaleY: 0 }, { scaleY: 1, duration: 0.9, ease: "power4.out" }, t0 + 0.1);
  tl.fromTo(small, { scaleY: 0 }, { scaleY: 1, duration: 0.7, ease: "power4.out" }, t0 + 0.7);
  const c1 = chip(st, T("Migrate", "Migrasi"), "outline", 180, 570, { height: "84px", fontSize: "32px" });
  const c2 = chip(st, T("Backup plan", "Rencana cadangan"), "light", 610, 570, { height: "84px", fontSize: "32px" });
  rise(c1, t0 + 0.3, 30, 0.6);
  rise(c2, t0 + 0.8, 30, 0.6);
  const win = chip(st, T("Far cheaper", "Jauh lebih murah"), "teal", 600, 250);
  gsap.set(win, { rotation: -6 });
  pop(win, t0 + 1.3);
  const s19 = assetPaths("spark19");
  const sp = svg(st, 840, 170, 110, 40, s19.vb);
  gsap.set(sp, { rotation: -30 });
  s19.paths.forEach((p) => draw(stroke(sp, p, "#fff", 10), t0 + 1.5, 0.4));
  const s18 = assetPaths("spark18");
  const sp2 = svg(st, 560, 160, 40, 100, s18.vb);
  gsap.set(sp2, { rotation: -20 });
  s18.paths.forEach((p) => draw(stroke(sp2, p, "#fff", 10), t0 + 1.55, 0.4));
};

S.running = (st, sc, d) => {
  const t0 = sc.start;
  const pc = box(el("div", "pcard", st, { background: "var(--base800)" }), 240, 10, 600, 190);
  gsap.set(pc, { rotation: -4 });
  rise(pc, t0);
  el("div", "", pc, { position: "absolute", left: "44px", top: "64px", font: "600 50px/1 Cabin, sans-serif", color: "#fff" }, "Microsoft 365");
  const dn = chip(pc, T("Down", "Mati"), "olive", undefined, undefined, { right: "34px", top: "46px", height: "84px", fontSize: "32px" });
  dn.style.position = "absolute";
  const words = L === "id" ? ["Email", "Telepon", "Chat", "Pesanan", "Invoice", "Rapat"] : ["Email", "Calls", "Chat", "Orders", "Invoices", "Meetings"];
  const tones = ["light", "teal", "light", "olive", "light", "teal"];
  [0, 1].forEach((row) => {
    const r = el("div", "", st, { position: "absolute", left: 0, top: (row ? 440 : 280) + "px", display: "flex", gap: "26px", whiteSpace: "nowrap" });
    for (let rep = 0; rep < 3; rep++) {
      words.forEach((w, k) => {
        const c = el("span", "chip " + (row ? tones[(k + 1) % 6] : tones[k]), r, { position: "static", height: "110px", fontSize: "44px", padding: "0 46px" }, w);
        if (row) c.style.fontFamily = "Chillax";
      });
    }
    const third = r.scrollWidth / 3;
    tl.fromTo(r, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, t0 + 0.2 + row * 0.15);
    if (row === 0) tl.fromTo(r, { x: 0 }, { x: -third, duration: d + 0.5, ease: "none" }, t0);
    else tl.fromTo(r, { x: -third }, { x: 0, duration: d + 0.5, ease: "none" }, t0);
  });
};

S.checklist = (st, sc, d) => {
  const t0 = sc.start;
  sc.labels.forEach((lab, k) => {
    const r = card(st, 60, 20 + k * 210, 960, 176, { borderRadius: "56px" });
    rise(r, t0 + 0.1 + k * 0.12);
    el("div", "chillax", r, { position: "absolute", left: "48px", top: "50px", fontSize: "72px", lineHeight: "1", color: "var(--m500)" }, `0${k + 1}`);
    el("div", "", r, { position: "absolute", left: "180px", top: "60px", font: "700 56px/1 Cabin, sans-serif", color: "var(--navy)" }, lab);
    const ring = box(el("div", "", r, { position: "absolute", border: "6px solid #1b3cff", borderRadius: "50%" }), 820, 38, 100, 100);
    const fill = disc(r, 820, 38, 100);
    const ck = svg(fill, 22, 24, 56, 52, "0 0 56 52", true);
    const cp = stroke(ck, "M6 28 L22 42 L50 10", "#fff", 10);
    const kt = t0 + sc.keys[k];
    tl.fromTo(fill, { scale: 0 }, { scale: 1, duration: 0.4, ease: "back.out(1.8)" }, kt);
    draw(cp, kt + 0.15, 0.3);
    void ring;
  });
};

S.comments = (st, sc, d) => {
  const t0 = sc.start;
  const avatars = ["var(--m500)", "var(--teal)", "var(--olive)"];
  const initials = ["A", "R", "S", "D", "M", "T", "K", "N"];
  const n = Math.floor((d - 0.2) / 0.85) + 1;
  for (let k = 0; k < n; k++) {
    const left = k % 2 === 0;
    const w = [640, 560, 600, 520][k % 4];
    const c = box(el("div", "", st, { position: "absolute", background: "#fff", borderRadius: "44px", boxShadow: "0 0 0 5px #1b3cff" }), left ? 60 : 200, 0, w, 130);
    const a = disc(c, 26, 26, 78, avatars[k % 3]);
    el("div", "", a, { position: "absolute", inset: 0, textAlign: "center", font: "700 34px/78px Inter, sans-serif", color: "#fff" }, initials[k % 8]);
    bar(c, 128, 38, w - 200, 18, "var(--m200)");
    bar(c, 128, 74, (w - 200) * 0.6, 16, "var(--m100)");
    const born = t0 + 0.2 + k * 0.85;
    gsap.set(c, { autoAlpha: 0 });
    tl.fromTo(c, { y: 560, autoAlpha: 0, scale: 0.9 }, { y: 430, autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(1.4)" }, born);
    tl.to(c, { y: -40, duration: 3.6, ease: "none" }, born + 0.5);
    tl.to(c, { autoAlpha: 0, duration: 0.6 }, born + 3.3);
  }
  const btn = disc(st, 880, 480, 150);
  btn.innerHTML = A.arrowLarge;
  const bs = btn.querySelector("svg");
  Object.assign(bs.style, { position: "absolute", left: "35px", top: "35px", width: "80px", height: "80px", transform: "rotate(90deg)" });
  bs.querySelectorAll("path").forEach((p) => p.setAttribute("stroke", "#fff"));
  pop(btn, t0 + 0.5);
  tl.to(btn, { y: 16, duration: 0.45, repeat: repeatsIn(d, 0.45), yoyo: true, ease: "sine.inOut" }, t0 + 0.95);
};

// ------------------------------------------------------------------ build
const ORDER = ["inbox", "nohack", "servers", "overload", "globe", "cause", "status", "late", "call", "switch", "costly", "scale", "running", "checklist", "comments"];

async function build() {
  await document.fonts.ready;
  buildBackgrounds();
  buildHeader();
  R.scenes.forEach((sc, i) => {
    buildHead(sc, i);
    const st = stageFor(sc, i, { cut: ORDER[i] === "servers" });
    S[ORDER[i]](st, sc, sc.end - sc.start);
  });
  buildCaptions();
  tl.set({}, {}, R.total);
  window.seekTo = (t) => { tl.seek(t, false); };
  window.READY = true;
}
build();
