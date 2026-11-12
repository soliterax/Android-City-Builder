// Denge simülasyonu: basit bir "bot başkan" oyunu tarayıcısız oynar ve
// ilerleme hızını raporlar. Kullanım: node tools/balance.js [oyun-saati] [seed]
// Amaç kusursuz oynamak değil; ekonominin kilitlenmediğini ve oyunun
// kaç saatte nereye vardığını kabaca görmek.
const CB = require('./headless.js')();
const sim = CB.sim, D = CB.D, B = D.B, W = CB.world, N = D.MAP;
const HOURS = +process.argv[2] || 30, SEED = +process.argv[3] || 4242;
const S = sim.newGame(SEED);
const log = [];
CB.on('win', () => log.push(`[${hrs()}sa] UZAY ÜSSÜ TAMAMLANDI`));
function hrs() { return (S.t / 3600).toFixed(1); }

// merkeze uzaklığa göre sıralı karo listesi
const order = [];
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) order.push([x, y, Math.hypot(x - 31.5, y - 31.5)]);
order.sort((a, b) => a[2] - b[2]);
const isRoadLine = (x, y) => x % 5 === 3 || y % 5 === 3;

function layRoads() {
  let n = 0;
  for (const [x, y] of order) {
    if (!isRoadLine(x, y) || !sim.owned(x, y) || S.road[W.idx(x, y)]) continue;
    if (S.money < 400) break;
    const ter = S.terrain[W.idx(x, y)];
    const id = ter === W.T.WATER ? 'bridge' : 'road';
    if (id === 'bridge' && (S.lvl < 6 || S.res.stone < 20)) continue;
    if (sim.place(id, x, y).ok) n++;
    if (n > 60) break;
  }
  if (n) sim.recalc();
}
function nearRoad(x, y, s) {
  const c = sim.R.conn;
  for (let i = 0; i < s; i++) {
    for (const [tx, ty] of [[x + i, y - 1], [x + i, y + s], [x - 1, y + i], [x + s, y + i]]) if (W.inB(tx, ty) && c[W.idx(tx, ty)]) return true;
  }
  return false;
}
const smallBlock = (x, y) => (Math.floor((x + 1) / 5) + 2 * Math.floor((y + 1) / 5)) % 3 === 0;
function findSpot(id, far, near, any) {
  const def = B[id], s = def.size;
  let list = far ? order.slice().reverse() : order;
  if (near) list = order.slice().sort((a, b) => Math.hypot(a[0] - near[0], a[1] - near[1]) - Math.hypot(b[0] - near[0], b[1] - near[1]));
  for (const [x, y] of list) {
    if (!sim.owned(x, y)) continue;
    let bad = false;
    for (let dy = 0; dy < s && !bad; dy++) for (let dx = 0; dx < s; dx++) if (isRoadLine(x + dx, y + dy)) { bad = true; break; }
    if (bad) continue;
    if (!any && !def.need && (s === 1) !== smallBlock(x, y)) continue; // küçük binalar ayrı adalara
    if (!sim.canPlace(id, x, y).ok) continue;
    if (!def.noRoad && !nearRoad(x, y, s)) continue;
    return [x, y];
  }
  return any ? null : findSpot(id, far, near, true);
}
// yola uzak ama kaynağa yakın bir yer bul ve oraya yol döşe (oduncu, taş ocağı, maden...)
function spotWithRoad(id) {
  const def = B[id], s = def.size, T = W.T;
  const free = (x, y) => W.inB(x, y) && sim.owned(x, y) && !sim.R.at[W.idx(x, y)] && [T.GRASS, T.SAND, T.FOREST].includes(S.terrain[W.idx(x, y)]);
  let tries = 0;
  for (const [x, y] of order) {
    if (!sim.owned(x, y) || !sim.canPlace(id, x, y).ok) continue;
    if (++tries > 40) break;
    // BFS: bina çevresinden bağlı bir yola
    const prev = new Map(), q = [], inFoot = (tx, ty) => tx >= x && tx < x + s && ty >= y && ty < y + s;
    for (let i = 0; i < s; i++) for (const t of [[x + i, y - 1], [x + i, y + s], [x - 1, y + i], [x + s, y + i]]) if (free(t[0], t[1]) || (W.inB(t[0], t[1]) && S.road[W.idx(t[0], t[1])])) { prev.set(W.idx(t[0], t[1]), -1); q.push(t); }
    let goal = null;
    for (let h = 0; h < q.length && h < 600 && !goal; h++) {
      const [cx, cy] = q[h];
      if (sim.R.conn[W.idx(cx, cy)]) { goal = [cx, cy]; break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy, k = W.inB(nx, ny) ? W.idx(nx, ny) : -1;
        if (k < 0 || prev.has(k) || inFoot(nx, ny)) continue;
        if (free(nx, ny) || S.road[k]) { prev.set(k, W.idx(cx, cy)); q.push([nx, ny]); }
      }
    }
    if (!goal) continue;
    let k = W.idx(goal[0], goal[1]), n = 0;
    while (k !== -1 && n++ < 60) { const tx = k % N, ty = (k / N) | 0; if (!S.road[k]) sim.place('road', tx, ty); k = prev.get(k); }
    sim.recalc();
    if (sim.canPlace(id, x, y).ok && nearRoad(x, y, s)) return [x, y];
  }
  return null;
}
const lack = {};   // eksik kalan kaynaklar
function build(id, opt) {
  const def = B[id];
  if (!def || !sim.unlocked(def)) return false;
  if (def.max && sim.totalOf(id) >= def.max) return false;
  if (!sim.canAfford(def.cost, 100)) {
    for (const r in def.cost) if (r !== 'money' && S.res[r] < def.cost[r]) lack[r] = Math.max(lack[r] || 0, def.cost[r]);
    return false;
  }
  let spot = findSpot(id, opt && opt.far, opt && opt.near);
  if (!spot && def.need) spot = spotWithRoad(id);
  if (!spot) { needLand = true; return false; }
  return sim.place(id, spot[0], spot[1]).ok;
}
let needLand = false;
const best = ids => { for (const id of ids) if (sim.unlocked(B[id]) && !(B[id].max && sim.totalOf(id) >= B[id].max)) return id; return null; };
const pending = () => S.bl.filter(b => b.st).length;

function step() {
  const tot = sim.R.tot, rate = sim.R.rate;
  if (S.missionDone) sim.claimMission();
  S.daily.tasks.forEach((t, i) => sim.claimDaily(i)); sim.claimLogin();
  // araştırma: en ucuz hazır olan
  for (const id of D.TECH_ORDER) if (sim.techState(id) === 'ready') { sim.research(id); break; }
  // sözleşmeler
  S.contracts.forEach((c, i) => {
    if (!sim.canDeliver(c)) return;
    for (const r in c.req) if (S.res[r] - c.req[r] < Math.max(60, lack[r] || 0)) return; // yedek bırak
    sim.deliver(i);
  });
  // orman bittiyse oduncuların çevresine ağaç dik
  if (S.money > 600 && sim.R.rate.res.wood < 3 + S.lvl / 2) {
    let planted = 0;
    for (const b of S.bl) {
      if (b.id !== 'lumber' || planted > 12) continue;
      if (sim.nearCount(b.x, b.y, 1, 3, W.T.FOREST) >= 14) continue;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const x = b.x + dx, y = b.y + dy;
        if (planted <= 12 && W.inB(x, y) && !isRoadLine(x, y) && sim.place('tree', x, y).ok) planted++;
      }
    }
  }
  // onarım
  S.bl.forEach(b => { if (b.dmg) sim.repair(b); });
  // belediye
  const th = sim.R.th, up = sim.upgradeInfo(th);
  if (up && !th.st) { if (up.need <= S.lvl) { if (!sim.upgrade(th).ok) for (const r in up.cost) if (r !== 'money' && S.res[r] < up.cost[r]) lack[r] = Math.max(lack[r] || 0, up.cost[r]); } }
  layRoads();
  if (pending() >= tot.crews + 2) return;
  needLand = false;
  const ms = D.MISSIONS[S.mission], g = ms && ms.goal;

  // --- acil ihtiyaçlar ---
  if (tot.pgen < tot.pdem * 1.15 + 4) { if (build(best(['fusion', 'nuclear', 'solar', 'coal', 'wind']), { far: true })) return; }
  if (tot.wgen < tot.wdem * 1.15 + 4) { if (build(best(['treatment', 'pump', 'watertower']), { far: true }) || build('watertower')) return; }
  if (S.pop > 10 && (rate.res.food < 1 || S.res.food < 40)) { if (build(best(['greenhouse', 'fishery', 'farm'])) || build('farm')) return; }
  // depo: maliyetler kapasiteyi aşıyorsa
  const maxLack = Math.max(0, ...Object.values(lack));
  if (maxLack > tot.stor * 0.9 || D.RES_ORDER.some(r => S.res[r] >= tot.stor - 1 && lack[r])) { if (build(best(['warehouse', 'depot']))) return; }
  // hammadde üreticileri
  const cnt = id => sim.totalOf(id);
  const lvl = S.lvl;
  if (cnt('lumber') < 2 + lvl / 3 && (lack.wood || rate.res.wood < 6 + lvl * 1.5)) { if (build('lumber')) return; }
  if (lvl >= 4 && cnt('quarry') < 1 + lvl / 6 && (lack.stone || rate.res.stone < 3 + lvl / 2)) { if (build('quarry', { far: true })) return; }
  if (lvl >= 9 && cnt('mine') < 1 + lvl / 7) { if (build('mine', { far: true })) return; }
  if (lvl >= 10 && cnt('steelmill') < cnt('mine')) { if (build('steelmill', { far: true })) return; }
  if (lvl >= 15 && cnt('factory') < 1 + lvl / 9) { if (build('factory', { far: true })) return; }
  if (lvl >= 24 && cnt('techfab') < 1 + (lvl - 24) / 5) { if (build('techfab', { far: true })) return; }
  if (cnt('bazaar') < 1 && build('bazaar')) return;
  if (cnt('builder') < 2 && build('builder')) return;
  // pazar: eksik kaynağı satın al, fazlayı sat
  if (sim.hasMarket()) {
    for (const r in lack) { if (S.res[r] < lack[r] && S.money > sim.buyPrice(r) * 200) sim.marketBuy(r, Math.min(100, lack[r] - S.res[r])); }
    D.RES_ORDER.forEach(r => { if (S.res[r] >= tot.stor * 0.95 && !lack[r]) sim.marketSell(r, Math.floor(tot.stor * 0.3)); });
  }
  for (const r in lack) if (S.res[r] >= lack[r]) delete lack[r];

  // --- görev hedefi ---
  if (g) {
    if (g.t === 'b' && sim.totalOf(g.id) < g.n) { if (build(g.id, { far: !!B[g.id].pol })) return; }
    if (g.t === 'upg' || (Math.random() < 0.06 && !Object.keys(lack).length)) {
      const c = S.bl.filter(b => !b.st && !b.dmg && b.id !== 'townhall' && sim.upgradeInfo(b) && sim.canAfford(sim.upgradeInfo(b).cost, 200));
      if (c.length) { sim.upgrade(c[(Math.random() * c.length) | 0]); return; }
    }
    if (g.t === 'wonder') { for (const id of ['clocktower', 'lighthouse', 'grandlibrary', 'opera', 'tvtower', 'monument']) if (!sim.totalOf(id) && build(id)) return; }
  }
  // bölge
  if ((needLand || (g && g.t === 'reg') || Math.random() < 0.05) && sim.ownedCount() < D.TH[S.th].regions && S.money > sim.regionCost() * 1.5) {
    const c = []; for (let r = 0; r < 64; r++) if (sim.regionBuyable(r)) c.push(r);
    c.sort((a, b) => Math.hypot(a % 8 - 3.5, (a >> 3) - 3.5) - Math.hypot(b % 8 - 3.5, (b >> 3) - 3.5));
    if (c.length) { sim.buyRegion(c[Math.random() < 0.6 ? 0 : (Math.random() * c.length) | 0]); return; }
  }
  // --- hizmetler ---
  const res = S.bl.filter(b => B[b.id].cap && b.st !== 1), cov = sim.R.cov;
  const SV = [['police', ['policehq', 'police']], ['fire', ['firehq', 'fire']], ['health', ['hospital', 'clinic']], ['edu', ['university', 'highschool', 'school']]];
  for (const [t, ids] of SV) {
    const un = res.filter(b => cov[t][W.idx(b.x, b.y)] < 0.4);
    if (un.length > res.length * 0.25 && un.length > 3) { const b = un[(Math.random() * un.length) | 0]; if (build(best(ids), { near: [b.x, b.y] })) return; }
  }
  const unl = res.filter(b => cov.leisure[W.idx(b.x, b.y)] < 8);
  if (unl.length > res.length * 0.3 && lvl >= 3) { const b = unl[(Math.random() * unl.length) | 0]; if (build(best(['stadium', 'amusement', 'museum', 'cinema', 'square', 'garden', 'playground', 'fountain', 'park']), { near: [b.x, b.y] }) || build('park', { near: [b.x, b.y] })) return; }
  // bilim
  if (lvl >= 5 && rate.sci < lvl * 0.8) { if (build(best(['lab', 'university', 'highschool', 'library', 'school']))) return; }
  // --- büyüme: iş / konut dengesi ---
  if (tot.jobs < tot.workforce * 0.95) {
    const com = best(['plaza', 'bank', 'hotel', 'mall', 'office', 'restaurant', 'market', 'shop']);
    if (com && (B[com].cust ? tot.cr > 0.9 : true) && build(com)) return;
    if (build(best(['office', 'shop']))) return;
  }
  if (S.pop >= tot.housing * 0.85 || tot.jobs > tot.workforce) {
    if (build(best(['arcology', 'skyscraper', 'residence', 'block', 'apartment', 'townhouse', 'house', 'hut']))) return;
    if (build(best(['block', 'apartment', 'townhouse', 'house', 'hut']))) return;
    if (build(best(['house', 'hut']))) return;
  }
  for (const id of ['port', 'airport', 'clocktower', 'lighthouse', 'grandlibrary', 'opera', 'tvtower', 'monument', 'spaceport']) if (!sim.totalOf(id) && S.money > (B[id].cost.money || 0) * 2 && build(id)) return;
}

const DT = 5, total = HOURS * 3600 / DT;
let nextReport = 0, lastLvl = 1;
console.log('saat | sv | nüfus | kasa | gelir/dk | mutlu | belediye | bölge | bina | görev | tekno');
for (let i = 0; i < total; i++) {
  sim.tick(DT, true);
  if (i % 2 === 0) step();
  if (S.t >= nextReport) {
    const tot = sim.R.tot;
    console.log([hrs().padStart(5), String(S.lvl).padStart(2), CB.fmt(S.pop).padStart(7), CB.fmt(S.money).padStart(8), CB.fmtRate(sim.R.rate.money).padStart(8), ('%' + Math.round(tot.happy)).padStart(4), D.TH[S.th].name.padEnd(12), String(sim.ownedCount()).padStart(2), String(S.bl.length).padStart(4), String(S.mission).padStart(2) + ' ' + (D.MISSIONS[S.mission] ? D.MISSIONS[S.mission].title : '-'), sim.techCount()].join(' | '));
    nextReport += S.t < 3600 ? 600 : S.t < 6 * 3600 ? 3600 : 3 * 3600;
  }
}
console.log(log.join('\n'));
console.log('eksik kaynak:', JSON.stringify(lack), ' stok:', JSON.stringify(Object.fromEntries(D.RES_ORDER.map(r => [r, Math.round(S.res[r])]))), 'depo', sim.R.tot.stor);
console.log('başarım', Object.keys(S.ach).length + '/' + D.ACH.length, 'sözleşme', S.stats.contracts, 'yükseltme', S.stats.upgrades);
{
  const tot = sim.R.tot, c = {};
  S.bl.forEach(b => { c[b.id] = (c[b.id] || 0) + 1; });
  console.log('iş/işgücü', tot.jobs, tot.workforce, 'wr', tot.wr.toFixed(2), 'pr', tot.pr.toFixed(2), 'wtr', tot.wtr.toFixed(2), 'konut', tot.housing, 'ekip', tot.crews);
  console.log('oran/dk', JSON.stringify(Object.fromEntries(D.RES_ORDER.map(r => [r, +sim.R.rate.res[r].toFixed(1)]))));
  console.log('oduncu', S.bl.filter(b => b.id === 'lumber').map(b => (b.ok ? 'ok' : 'x') + ' v' + (b.eff || 0).toFixed(2) + ' b' + b.bonus.toFixed(2)).join(', '));
  console.log('binalar', JSON.stringify(c));
}
