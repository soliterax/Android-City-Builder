// Hızlı doğrulama: oyun mantığı tarayıcısız yüklenir, küçük bir köy kurulur,
// simülasyon ilerletilir, kayıt/yükleme ve çevrimdışı ilerleme sınanır.
// Kullanım: node tools/smoke.js   (hata varsa çıkış kodu 1)
const assert = require('assert');
const CB = require('./headless.js')();
const sim = CB.sim, D = CB.D;

// 1) veri tutarlılığı
for (const id of D.ORDER) {
  const d = D.B[id];
  assert(d.name && d.cat, id + ': ad/kategori eksik');
  for (const r in d.cost) assert(r === 'money' || D.RES[r], id + ': bilinmeyen kaynak ' + r);
  for (const k of ['prod', 'cons']) for (const r in (d[k] || {})) assert(D.RES[r], id + ': bilinmeyen kaynak ' + r);
  if (d.tech) assert(D.TECH[d.tech], id + ': bilinmeyen teknoloji ' + d.tech);
}
for (const id of D.TECH_ORDER) { const t = D.TECH[id]; if (t.req) assert(D.TECH[t.req], id + ': önkoşul yok'); if (t.eff.unlock) assert(D.B[t.eff.unlock], id + ': açtığı bina yok'); }
for (const m of D.MISSIONS) if (m.goal.t === 'b') assert(D.B[m.goal.id], 'görev: bilinmeyen bina ' + m.goal.id);
for (let l = 2; l <= 10; l++) for (const r in D.TH[l].cost) assert(r === 'money' || D.RES[r]);

// 2) birkaç farklı haritada başlangıç garantileri
for (const seed of [1, 7, 99, 4242, 123456, 987654321]) {
  const S = sim.newGame(seed), T = CB.world.T;
  const cnt = t => { let c = 0; for (let y = 16; y < 48; y++) for (let x = 16; x < 48; x++) if (S.terrain[x + y * 64] === t) c++; return c; };
  assert(cnt(T.FOREST) >= 10, 'orman az: ' + seed);
  assert(cnt(T.ROCK) >= 3, 'kaya az: ' + seed);
  assert(cnt(T.WATER) >= 10, 'su az: ' + seed);
  let ore = 0; S.terrain.forEach(t => { if (t === T.ORE) ore++; }); assert(ore >= 6, 'cevher az: ' + seed);
}

// 3) küçük köy senaryosu
const S = sim.newGame(777);
const P = (id, x, y) => { const r = sim.place(id, x, y); assert(r.ok, id + '@' + x + ',' + y + ': ' + r.reason); return r.b; };
for (let x = 29; x <= 34; x++) P('hut', x, 34);
P('wind', 28, 34); P('watertower', 35, 34);
for (let i = 0; i < 300; i++) sim.tick(1);
assert(S.pop > 10, 'nüfus artmadı: ' + S.pop);
assert(S.lvl >= 2, 'seviye atlanmadı');
assert(sim.R.rate.money > 0, 'gelir yok');
assert(Number.isFinite(S.money) && Number.isFinite(sim.R.tot.happy), 'NaN');
// yola bağlı olmayan bina çalışmamalı
const far = P('hut', 25, 25); for (let i = 0; i < 30; i++) sim.tick(1);
assert(!far.ok && far.pop === 0, 'yolsuz bina çalışıyor');
// yıkım + iade
const m0 = S.money; sim.demolish(far); assert(S.money > m0, 'iade yok');

// 4) kayıt / yükleme
const json = sim.serialize(), pop = S.pop, n = S.bl.length;
sim.load(json);
assert.strictEqual(sim.S.bl.length, n); assert.strictEqual(sim.S.pop, pop);

// 5) çevrimdışı ilerleme
const before = sim.S.money, off = sim.offline(4 * 3600);
assert(off && off.sec === 4 * 3600 && sim.S.money > before, 'çevrimdışı kazanç yok');
assert(sim.offline(100 * 3600).sec === 8 * 3600, 'çevrimdışı üst sınır yanlış');

console.log('OK - tüm kontroller geçti (' + D.ORDER.length + ' bina, ' + D.TECH_ORDER.length + ' teknoloji, ' + D.MISSIONS.length + ' görev, ' + D.ACH.length + ' başarım)');
