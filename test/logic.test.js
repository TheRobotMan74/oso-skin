// Pruebas de logic.js. Córrelas desde la carpeta del repo con: node --test
const test = require("node:test");
const assert = require("node:assert/strict");
const K = require("../logic.js");

const ST = K.cleanSettings({ start: "2026-10-26" });

test("ciclo de la fase 1: salicílico, Differin, descanso, descanso", () => {
  const types = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"].map((d) => K.info(d, ST).type);
  assert.deepEqual(types, ["bha", "ret", "rest", "rest", "bha"]);
});

test("antes de empezar no hay activos y el día anterior toca la foto del antes", () => {
  const s = K.steps("2026-10-25", ST);
  assert.equal(s.info.type, "pre");
  assert.deepEqual(s.am, ["am_clean", "am_hb", "am_spf"]);
  assert.deepEqual(s.ex, ["photo0"]);
});

test("los domingos toca foto de progreso", () => {
  assert.deepEqual(K.steps("2026-11-01", ST).ex, ["photo"]);
  assert.deepEqual(K.steps("2026-11-02", ST).ex, []);
});

test("fase 2 y azelaico desde el día 29", () => {
  assert.equal(K.info("2026-11-22", ST).aze, false);
  const f = K.info("2026-11-23", ST);
  assert.equal(f.phase.n, 2);
  assert.equal(f.aze, true);
  assert.deepEqual(K.steps("2026-11-23", ST).am, ["am_clean", "am_nia", "am_aze", "am_hb", "am_spf"]);
});

test("fase 3: Differin 3 de cada 4 noches", () => {
  const types = [0, 1, 2, 3].map((i) => K.info(K.add("2026-12-21", i), ST).type);
  assert.deepEqual(types, ["bha", "ret", "ret", "ret"]);
});

test("una pausa recorre el plan un día", () => {
  const st = K.cleanSettings({ start: "2026-10-26", pauses: ["2026-10-27"] });
  assert.equal(K.info("2026-10-27", st).type, "pause");
  assert.equal(K.info("2026-10-28", st).type, "ret");
  assert.equal(K.info("2026-10-28", st).day, 2);
});

test("las pausas inválidas, repetidas o antes del inicio se ignoran", () => {
  const st = K.cleanSettings({ start: "2026-10-26", pauses: ["2026-10-20", "x", "2026-02-30", "2026-10-28", "2026-10-28"] });
  assert.deepEqual(st.pauses, ["2026-10-28"]);
});

test("en pausa, la niacinamida es opcional para completar el día", () => {
  const st = K.cleanSettings({ start: "2026-10-26", pauses: ["2026-10-27"] });
  const day = K.cleanDay({ am: { am_clean: true, am_hb: true, am_spf: true }, pm: { pm_clean: true, pm_hb: true } });
  assert.equal(K.status("2026-10-27", st, day).full, true);
});

test("racha de bloqueador", () => {
  const days = {
    "2026-10-26": K.cleanDay({ am: { am_spf: true } }),
    "2026-10-27": K.cleanDay({ am: { am_spf: true } })
  };
  assert.equal(K.spfStreak("2026-10-27", days), 2);
  assert.equal(K.spfStreak("2026-10-28", days), 2); // hoy aún sin palomear: cuenta desde ayer
  assert.equal(K.spfStreak("2026-10-29", days), 0);
});

test("cuánto dura cada envase, y vuelve a contar al abrir uno nuevo", () => {
  const s = K.supply(ST);
  assert.equal(s.azeStart, "2026-11-23");
  assert.equal(s.nia.until, "2027-03-24");
  assert.equal(s.spf.until, K.add("2026-10-26", 39));
  const s2 = K.supply(K.cleanSettings({ start: "2026-10-26", opened: { spf: "2026-10-28", ret: "2027-01-02" } }));
  assert.equal(s2.spf.until, "2026-12-06");
  assert.equal(s2.ret.from, "2027-01-02");
  assert.ok(s2.ret.until > "2027-01-02");
});

test("juntar dos registros del mismo día no pierde nada", () => {
  const a = K.cleanDay({ am: { am_clean: true }, skin: 1, note: "reseca" });
  const b = K.cleanDay({ am: { am_spf: true }, pm: { pm_ret: true }, skin: 2, spots: 1, note: "pica" });
  const m = K.mergeDay(a, b);
  assert.deepEqual(Object.keys(m.am).sort(), ["am_clean", "am_spf"]);
  assert.equal(m.pm.pm_ret, true);
  assert.equal(m.skin, 1);
  assert.equal(m.spots, 1);
  assert.equal(m.note, "reseca\npica");
});

test("leer un respaldo", () => {
  const imp = K.parseBackup({
    app: "oso-skin", v: 1,
    settings: { start: "2026-10-26", pauses: [] },
    days: { "2026-10-26": { am: { am_spf: true }, junk: 1 }, nope: {}, "2026-10-27": {} }
  });
  assert.equal(imp.count, 1);
  assert.equal(imp.first, "2026-10-26");
  assert.equal(imp.settings.start, "2026-10-26");
  assert.equal(K.parseBackup({ foo: 1 }), null);
  assert.equal(K.parseBackup([1, 2]), null);
  assert.equal(K.parseBackup(null), null);
});

test("antes de las 4 a. m. cuenta como la noche anterior", () => {
  assert.equal(K.today(new Date(2026, 9, 27, 1, 30)), "2026-10-26");
  assert.equal(K.today(new Date(2026, 9, 27, 9, 0)), "2026-10-27");
});
