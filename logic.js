/* Oso Skin · lógica del plan, sin nada de pantalla.
   La usa la app (index.html) y las pruebas (node --test). */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KPM = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var WD = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  var WDL = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var MO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  var MOL = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var DEFAULT_START = "2026-10-26";
  var AZE_FROM = 28;      // el ácido azelaico entra el día 29 del plan (semana 5)
  var PLAN_WEEKS = 12;
  var PRODUCTS = ["ret", "nia", "bha", "aze", "spf"];
  var PHASES = [
    { n: 1, from: 0, to: 27, name: "Fase 1", span: "Semanas 1–4", cycle: ["bha", "ret", "rest", "rest"], blurb: "Tu piel se acostumbra: una noche de cada activo y dos de descanso." },
    { n: 2, from: 28, to: 55, name: "Fase 2", span: "Semanas 5–8", cycle: ["bha", "ret", "ret", "rest"], blurb: "El Differin sube a 2 de cada 4 noches y entra el azelaico en la mañana." },
    { n: 3, from: 56, to: Infinity, name: "Fase 3", span: "Mes 3 en adelante", cycle: ["bha", "ret", "ret", "ret"], blurb: "Differin 3 de cada 4 noches. Si te irrita, usa las pausas." }
  ];
  var RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  var ALL = { am: ["am_clean", "am_nia", "am_aze", "am_hb", "am_spf"], pm: ["pm_clean", "pm_bha", "pm_ret", "pm_hb"], ex: ["photo0", "photo"] };

  /* ---------- fechas (texto AAAA-MM-DD, sin zonas horarias) ---------- */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function valid(s) {
    var m = RE.exec(typeof s === "string" ? s : "");
    if (!m) return false;
    var y = +m[1], mo = +m[2] - 1, d = +m[3];
    if (y < 2000 || y > 2100) return false;
    var t = new Date(Date.UTC(y, mo, d));
    return t.getUTCMonth() === mo && t.getUTCDate() === d;
  }
  function num(s) { var m = RE.exec(s); return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000); }
  function str(n) { var t = new Date(n * 86400000); return t.getUTCFullYear() + "-" + pad(t.getUTCMonth() + 1) + "-" + pad(t.getUTCDate()); }
  function add(s, k) { return str(num(s) + k); }
  function diff(a, b) { return num(b) - num(a); }
  function dow(s) { return new Date(num(s) * 86400000).getUTCDay(); }
  function later(a, b) { return a > b ? a : b; }
  /* Antes de las 4 a. m. todavía cuenta como la noche anterior. */
  function today(now) {
    now = now || new Date();
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (now.getHours() < 4) d.setDate(d.getDate() - 1);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function shortDate(s) { var m = RE.exec(s); return WD[dow(s)] + " " + (+m[3]) + " " + MO[+m[2] - 1]; }
  function longDate(s) { var m = RE.exec(s); return WDL[dow(s)] + " " + (+m[3]) + " de " + MOL[+m[2] - 1]; }
  function monthLabel(ym) { return MOL[+ym.slice(5, 7) - 1] + " " + ym.slice(0, 4); }
  function daysInMonth(ym) { return new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate(); }

  /* ---------- ajustes y días guardados ---------- */
  function cleanSettings(raw) {
    var start = raw && valid(raw.start) ? raw.start : DEFAULT_START;
    var src = raw && Array.isArray(raw.pauses) ? raw.pauses : [];
    var seen = {}, pauses = [];
    for (var i = 0; i < src.length && pauses.length < 400; i++) {
      var p = src[i];
      if (valid(p) && p >= start && !seen[p]) { seen[p] = 1; pauses.push(p); }
    }
    pauses.sort();
    var os = raw && raw.opened && typeof raw.opened === "object" ? raw.opened : {}, opened = {};
    PRODUCTS.forEach(function (k) { if (valid(os[k])) opened[k] = os[k]; });
    return { start: start, pauses: pauses, opened: opened };
  }
  function cleanDay(raw) {
    var out = { am: {}, pm: {}, ex: {}, skin: null, spots: null, note: "" };
    if (!raw || typeof raw !== "object") return out;
    ["am", "pm", "ex"].forEach(function (k) {
      var src = raw[k];
      if (src && typeof src === "object") ALL[k].forEach(function (id) { if (src[id] === true) out[k][id] = true; });
    });
    if (raw.skin === 0 || raw.skin === 1 || raw.skin === 2 || raw.skin === 3) out.skin = raw.skin;
    if (raw.spots === 0 || raw.spots === 1 || raw.spots === 2) out.spots = raw.spots;
    if (typeof raw.note === "string") out.note = raw.note.slice(0, 500);
    return out;
  }
  function isEmptyDay(d) {
    return !Object.keys(d.am).length && !Object.keys(d.pm).length && !Object.keys(d.ex).length &&
      d.skin === null && d.spots === null && !d.note;
  }
  /* Junta dos registros del mismo día sin perder nada palomeado. */
  function mergeDay(a, b) {
    var out = cleanDay(null);
    ["am", "pm", "ex"].forEach(function (k) {
      Object.keys(a[k]).forEach(function (id) { out[k][id] = true; });
      Object.keys(b[k]).forEach(function (id) { out[k][id] = true; });
    });
    out.skin = a.skin !== null ? a.skin : b.skin;
    out.spots = a.spots !== null ? a.spots : b.spots;
    out.note = a.note && b.note && a.note !== b.note ? (a.note + "\n" + b.note).slice(0, 500) : (a.note || b.note);
    return out;
  }
  /* Lee un respaldo exportado (o el formato de la página anterior). null si no sirve. */
  function parseBackup(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
    var src = obj.days;
    if (!src || typeof src !== "object" || Array.isArray(src)) return null;
    var days = {};
    Object.keys(src).forEach(function (k) {
      if (!valid(k)) return;
      var d = cleanDay(src[k]);
      if (!isEmptyDay(d)) days[k] = d;
    });
    var list = Object.keys(days).sort();
    var settings = obj.settings && typeof obj.settings === "object" && valid(obj.settings.start) ? cleanSettings(obj.settings) : null;
    if (!list.length && !settings) return null;
    return { settings: settings, days: days, count: list.length, first: list[0] || null, last: list[list.length - 1] || null };
  }

  /* ---------- el plan ---------- */
  function phaseOf(idx) {
    for (var i = 0; i < PHASES.length; i++) if (idx <= PHASES[i].to) return PHASES[i];
    return PHASES[PHASES.length - 1];
  }
  /* Qué toca un día. Las noches en pausa recorren el plan un día. */
  function info(date, st) {
    if (date < st.start) return { kind: "pre", type: "pre", idx: -1, toStart: diff(date, st.start), aze: false };
    var before = 0, paused = false;
    for (var i = 0; i < st.pauses.length; i++) {
      var p = st.pauses[i];
      if (p < date) before++; else if (p === date) paused = true;
    }
    var idx = diff(st.start, date) - before;
    var ph = phaseOf(idx);
    var n = (idx - ph.from) % 4;
    return { kind: paused ? "pause" : "active", type: paused ? "pause" : ph.cycle[n], idx: idx, phase: ph, night: n + 1, week: Math.floor(idx / 7) + 1, day: idx + 1, aze: idx >= AZE_FROM };
  }
  function steps(date, st) {
    var f = info(date, st);
    var am = f.kind === "pre" ? ["am_clean", "am_hb", "am_spf"]
      : (f.aze ? ["am_clean", "am_nia", "am_aze", "am_hb", "am_spf"] : ["am_clean", "am_nia", "am_hb", "am_spf"]);
    var pm = f.type === "bha" ? ["pm_clean", "pm_bha", "pm_hb"]
      : f.type === "ret" ? ["pm_clean", "pm_ret", "pm_hb"] : ["pm_clean", "pm_hb"];
    var ex = [];
    if (f.kind === "pre") { if (f.toStart === 1) ex.push("photo0"); }
    else if (dow(date) === 0) ex.push("photo");
    var opt = f.kind === "pause" ? { am_nia: true, am_aze: true } : {};
    return { info: f, am: am, pm: pm, ex: ex, opt: opt };
  }
  function status(date, st, day) {
    var s = steps(date, st), done = 0, total = 0, amOk = true, pmOk = true;
    s.am.forEach(function (k) { if (s.opt[k]) return; total++; if (day && day.am[k]) done++; else amOk = false; });
    s.pm.forEach(function (k) { total++; if (day && day.pm[k]) done++; else pmOk = false; });
    return { done: done, total: total, full: done === total, any: done > 0, am: amOk, pm: pmOk };
  }
  /* Días seguidos con bloqueador. Si hoy todavía no lo palomeas, cuenta desde ayer. */
  function spfStreak(t, days) {
    var d = t, n = 0;
    if (!(days[d] && days[d].am.am_spf)) d = add(d, -1);
    while (days[d] && days[d].am.am_spf && n < 3660) { n++; d = add(d, -1); }
    return n;
  }
  function nth(from, n, pred, limit) {
    var c = 0;
    for (var i = 0; i < limit; i++) { var d = add(from, i); if (pred(d)) { c++; if (c >= n) return d; } }
    return null;
  }
  /* Hasta cuándo alcanza cada envase según el plan, contando desde que lo abriste. */
  function supply(st) {
    function isRet(d) { return info(d, st).type === "ret"; }
    function isBha(d) { return info(d, st).type === "bha"; }
    function isAze(d) { return info(d, st).aze; }
    var o = st.opened || {};
    function from(k, base) { return o[k] ? later(o[k], base) : base; }
    var azeStart = nth(st.start, 1, isAze, 900);
    var ret = from("ret", st.start), nia = from("nia", st.start), bha = from("bha", st.start), spf = from("spf", st.start);
    var aze = azeStart ? from("aze", azeStart) : null;
    return {
      azeStart: azeStart,
      ret: { from: ret, until: nth(ret, 30, isRet, 900) },
      nia: { from: nia, until: add(nia, 149) },
      bha: { from: bha, until: nth(bha, 150, isBha, 900) },
      aze: aze ? { from: aze, until: nth(aze, 100, isAze, 900) } : null,
      spf: { from: spf, until: add(spf, 39) }
    };
  }

  return {
    DEFAULT_START: DEFAULT_START, PLAN_WEEKS: PLAN_WEEKS, PHASES: PHASES, PRODUCTS: PRODUCTS,
    valid: valid, add: add, diff: diff, dow: dow, today: today, shortDate: shortDate, longDate: longDate,
    monthLabel: monthLabel, daysInMonth: daysInMonth,
    cleanSettings: cleanSettings, cleanDay: cleanDay, isEmptyDay: isEmptyDay, mergeDay: mergeDay, parseBackup: parseBackup,
    info: info, steps: steps, status: status, spfStreak: spfStreak, supply: supply
  };
});
