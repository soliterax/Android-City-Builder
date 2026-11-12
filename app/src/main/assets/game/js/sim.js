'use strict';
/* Kent Ustası - simülasyon: ekonomi, nüfus, inşaat, olaylar, görevler */
(function () {
  var D = CB.D, N = D.MAP, W = CB.world, T = W.T, B = D.B;
  var sim = CB.sim = {};
  var S = null;   // kayıtlı durum
  var R = null;   // çalışma zamanı (kaydedilmez)

  var MODKEYS = ['food', 'wood', 'mineral', 'steel', 'fab', 'tax', 'com', 'build', 'stor', 'radius', 'pollution', 'upkeep', 'sci', 'offline', 'util', 'happy', 'cap', 'contract'];
  var RESMOD = { food: 'food', wood: 'wood', stone: 'mineral', ore: 'mineral', steel: 'steel', goods: 'fab', elec: 'fab' };
  var NEEDR = { forest: 3, rock: 2, ore: 2, water: 1 };
  var NEEDT = { forest: T.FOREST, rock: T.ROCK, ore: T.ORE, water: T.WATER };
  var NEEDNAME = { forest: 'Yakında orman yok (3 kare)', rock: 'Yakında kayalık yok (2 kare)', ore: 'Yakında cevher yatağı yok (2 kare)', water: 'Suya bitişik olmalı' };

  /* ================= YENİ OYUN / YÜKLEME ================= */
  sim.newGame = function (seed) {
    seed = (seed >>> 0) || 12345;
    S = sim.S = {
      v: 1, seed: seed, t: 0, money: 5000,
      res: { food: 150, wood: 120, stone: 60, ore: 0, steel: 0, goods: 0, elec: 0 },
      xp: 0, lvl: 1, tax: 10, th: 1, pop: 0, sci: 0,
      terrain: W.generate(seed), road: new Uint8Array(N * N), own: new Uint8Array(64),
      bl: [], uid: 1, techs: {},
      mission: 0, missionDone: false,
      daily: { date: '', tasks: [], streak: 0, lastLogin: '', loginClaim: true },
      ach: {}, stats: { built: 0, earned: 0, roads: 0, contracts: 0, upgrades: 0, firesOut: 0, sciEarned: 0, play: 0, parks: 0 },
      effects: [], contracts: [], prices: {},
      speed: 1, hist: [], nextEvent: 240, nextFire: 600, won: false,
      set: { sound: true, night: true, haptic: true },
      saved: Date.now(), name: 'Yeni Kent'
    };
    [27, 28, 35, 36].forEach(function (r) { S.own[r] = 1; });
    D.RES_ORDER.forEach(function (r) { S.prices[r] = 1; });
    S.bl.push({ uid: S.uid++, id: 'townhall', x: 31, y: 31, l: 1, st: 0, q: 0, tot: 0, pop: 0 });
    for (var x = 29; x <= 34; x++) S.road[W.idx(x, 33)] = 1;
    sim.initRuntime();
    sim.checkDaily();
    return S;
  };

  sim.initRuntime = function () {
    R = sim.R = {
      at: new Array(N * N), conn: new Uint8Array(N * N),
      cov: { police: new Float32Array(N * N), fire: new Float32Array(N * N), health: new Float32Array(N * N), edu: new Float32Array(N * N), leisure: new Float32Array(N * N), pol: new Float32Array(N * N) },
      mod: {}, tot: {}, count: {}, rate: { money: 0, sci: 0, res: {} }, flow: { tax: 0, com: 0, up: 0 },
      dirty: true, lastCalc: -99, th: null
    };
    D.RES_ORDER.forEach(function (r) { R.rate.res[r] = 0; });
    for (var i = 0; i < S.bl.length; i++) stamp(S.bl[i], S.bl[i]);
    sim.recalc();
  };

  function stamp(b, val) {
    var s = B[b.id].size;
    for (var dy = 0; dy < s; dy++) for (var dx = 0; dx < s; dx++) R.at[W.idx(b.x + dx, b.y + dy)] = val;
  }

  /* ================= YARDIMCILAR ================= */
  sim.owned = function (x, y) { return W.inB(x, y) && S.own[W.regOf(x, y)] === 1; };
  sim.ownedCount = function () { var c = 0; for (var i = 0; i < 64; i++) c += S.own[i]; return c; };
  sim.storageCap = function () { return R.tot.stor || 300; };
  sim.canAfford = function (cost, extraMoney) {
    for (var r in cost) {
      if (r === 'money') { if (S.money < cost.money + (extraMoney || 0)) return false; }
      else if ((S.res[r] || 0) < cost[r]) return false;
    }
    if (!cost.money && extraMoney && S.money < extraMoney) return false;
    return true;
  };
  function pay(cost) {
    for (var r in cost) { if (r === 'money') S.money -= cost.money; else S.res[r] -= cost[r]; }
  }
  function give(rew) {
    for (var r in rew) {
      if (r === 'money') { S.money += rew.money; }
      else if (r === 'xp') sim.addXp(rew.xp);
      else if (r === 'sci') S.sci += rew.sci;
      else if (S.res[r] !== undefined) S.res[r] = Math.min(Math.max(sim.storageCap(), S.res[r]), S.res[r] + rew[r]);
    }
  }
  sim.give = give;

  sim.addXp = function (n) {
    S.xp += Math.round(n);
    while (S.lvl < D.MAX_LVL && S.xp >= D.xpNeed(S.lvl)) {
      S.xp -= D.xpNeed(S.lvl);
      S.lvl++;
      var reward = Math.round(150 * Math.pow(S.lvl, 1.5) / 50) * 50;
      S.money += reward;
      CB.emit('levelup', { lvl: S.lvl, unlocks: D.unlocksAt(S.lvl), reward: reward });
    }
  };
  sim.xpFor = function (def, lvl) { return Math.max(2, Math.round(1.2 * Math.pow((def.cost.money || 50) * (D.UPC[lvl - 1] || 1), 0.62))); };

  function ringConn(b) {
    var s = B[b.id].size, i;
    for (i = 0; i < s; i++) {
      if (cn(b.x + i, b.y - 1) || cn(b.x + i, b.y + s) || cn(b.x - 1, b.y + i) || cn(b.x + s, b.y + i)) return true;
    }
    return false;
  }
  function cn(x, y) { return W.inB(x, y) && R.conn[W.idx(x, y)] === 1; }

  function nearCount(x, y, size, k, type) {
    var c = 0;
    for (var ty = y - k; ty < y + size + k; ty++) for (var tx = x - k; tx < x + size + k; tx++) {
      if (W.inB(tx, ty) && S.terrain[W.idx(tx, ty)] === type) c++;
    }
    return c;
  }
  sim.nearCount = nearCount;

  sim.countOf = function (id) { return R.count[id] || 0; };
  sim.totalOf = function (id) { // inşaat halindekiler dahil
    var c = 0; for (var i = 0; i < S.bl.length; i++) if (S.bl[i].id === id) c++; return c;
  };
  sim.unlocked = function (def) {
    if (def.lvl > S.lvl) return false;
    if (def.tech && !S.techs[def.tech]) return false;
    return true;
  };
  sim.lockReason = function (def) {
    if (def.lvl > S.lvl) return 'Seviye ' + def.lvl;
    if (def.tech && !S.techs[def.tech]) return 'Araştırma: ' + D.TECH[def.tech].name;
    return '';
  };
  sim.canUpgrade = function (def) {
    if (def.id === 'townhall') return true;
    if (def.tool || def.crew || def.id === 'bazaar') return false;
    return !!(def.cap || def.inc || def.prod || def.pgen || def.wgen || def.svc || def.stor || def.sci || def.glob);
  };
  sim.maxLvl = function (def) { return def.id === 'townhall' ? 10 : (sim.canUpgrade(def) ? 3 : 1); };

  /* ================= YERLEŞTİRME ================= */
  // tools: road, bridge, tree, bulldoze
  sim.canPlace = function (id, x, y, ignore) {
    var def = B[id], s = def.size, trees = 0;
    for (var dy = 0; dy < s; dy++) for (var dx = 0; dx < s; dx++) {
      var tx = x + dx, ty = y + dy;
      if (!W.inB(tx, ty)) return { ok: false, reason: 'Harita dışı' };
      if (!sim.owned(tx, ty)) return { ok: false, reason: 'Bu bölge senin değil' };
      var i = W.idx(tx, ty), ter = S.terrain[i], bb = R.at[i];
      if (bb && bb !== ignore) return { ok: false, reason: 'Burası dolu' };
      if (id === 'bridge') { if (ter !== T.WATER) return { ok: false, reason: 'Köprü sadece suya kurulur' }; if (S.road[i]) return { ok: false, reason: 'Burada zaten köprü var' }; continue; }
      if (S.road[i]) return { ok: false, reason: id === 'road' ? 'Burada zaten yol var' : 'Yolun üzerine kurulamaz' };
      if (ter === T.WATER) return { ok: false, reason: 'Suya kurulamaz' };
      if (ter === T.ROCK || ter === T.ORE) return { ok: false, reason: 'Kayalığa kurulamaz' };
      if (id === 'tree') { if (ter !== T.GRASS) return { ok: false, reason: 'Sadece çimene dikilir' }; }
      if (ter === T.FOREST) trees++;
    }
    if (def.need && nearCount(x, y, s, NEEDR[def.need], NEEDT[def.need]) === 0) return { ok: false, reason: NEEDNAME[def.need] };
    return { ok: true, trees: trees };
  };

  sim.place = function (id, x, y) {
    var def = B[id];
    if (!sim.unlocked(def)) return { ok: false, reason: 'Kilitli: ' + sim.lockReason(def) };
    if (def.max && sim.totalOf(id) >= def.max) return { ok: false, reason: 'En fazla ' + def.max + ' adet kurulabilir' };
    var c = sim.canPlace(id, x, y);
    if (!c.ok) return c;
    var extra = c.trees * 15;
    if (!sim.canAfford(def.cost, extra)) return { ok: false, reason: 'Yetersiz kaynak' };
    pay(def.cost); S.money -= extra;
    if (c.trees) S.res.wood = Math.min(Math.max(sim.storageCap(), S.res.wood), S.res.wood + c.trees * 3);
    var i, dx, dy;
    if (id === 'road' || id === 'bridge') {
      i = W.idx(x, y);
      if (S.terrain[i] === T.FOREST) S.terrain[i] = T.GRASS;
      S.road[i] = id === 'bridge' ? 2 : 1; S.stats.roads++;
      R.dirty = true; CB.emit('terrain', { x: x, y: y });
      return { ok: true };
    }
    if (id === 'tree') {
      S.terrain[W.idx(x, y)] = T.FOREST; R.dirty = true; CB.emit('terrain', { x: x, y: y });
      return { ok: true };
    }
    for (dy = 0; dy < def.size; dy++) for (dx = 0; dx < def.size; dx++) {
      i = W.idx(x + dx, y + dy);
      if (S.terrain[i] === T.FOREST) { S.terrain[i] = T.GRASS; }
    }
    if (c.trees) CB.emit('terrain', { x: x, y: y });
    var b = { uid: S.uid++, id: id, x: x, y: y, l: 1, st: def.time > 0 ? 1 : 0, q: def.time, tot: def.time, pop: 0 };
    S.bl.push(b); stamp(b, b); R.dirty = true;
    if (!b.st) finish(b, true);
    return { ok: true, b: b };
  };

  sim.bulldozeTile = function (x, y) {
    if (!sim.owned(x, y)) return { ok: false, reason: 'Bu bölge senin değil' };
    var i = W.idx(x, y);
    if (S.road[i]) { S.road[i] = 0; R.dirty = true; CB.emit('terrain', { x: x, y: y }); return { ok: true }; }
    if (S.terrain[i] === T.FOREST && !R.at[i]) {
      if (S.money < 15) return { ok: false, reason: 'Yetersiz para' };
      S.money -= 15; S.terrain[i] = T.GRASS;
      S.res.wood = Math.min(Math.max(sim.storageCap(), S.res.wood), S.res.wood + 3);
      R.dirty = true; CB.emit('terrain', { x: x, y: y });
      return { ok: true };
    }
    return { ok: false, silent: true };
  };

  sim.refund = function (b) {
    var def = B[b.id];
    return Math.round((def.cost.money || 0) * (b.st === 1 ? 0.8 : 0.3));
  };
  sim.demolish = function (b) {
    if (b.id === 'townhall') return { ok: false, reason: 'Belediye yıkılamaz' };
    S.money += sim.refund(b);
    stamp(b, undefined);
    S.bl.splice(S.bl.indexOf(b), 1);
    R.dirty = true;
    return { ok: true };
  };

  sim.move = function (b, x, y) {
    var c = sim.canPlace(b.id, x, y, b);
    if (!c.ok) return c;
    var extra = c.trees * 15;
    if (S.money < extra) return { ok: false, reason: 'Yetersiz para' };
    S.money -= extra;
    stamp(b, undefined);
    b.x = x; b.y = y;
    var s = B[b.id].size;
    for (var dy = 0; dy < s; dy++) for (var dx = 0; dx < s; dx++) {
      var i = W.idx(x + dx, y + dy);
      if (S.terrain[i] === T.FOREST) S.terrain[i] = T.GRASS;
    }
    stamp(b, b); R.dirty = true; CB.emit('terrain', { x: x, y: y });
    return { ok: true };
  };

  /* ================= YÜKSELTME / ONARIM ================= */
  sim.upgradeInfo = function (b) {
    var def = B[b.id];
    if (b.l >= sim.maxLvl(def)) return null;
    if (b.id === 'townhall') {
      var th = D.TH[b.l + 1];
      return { cost: th.cost, time: th.time, need: th.need, name: th.name };
    }
    return { cost: D.costAt(def, b.l + 1), time: Math.max(5, Math.round(def.time * D.UPT[b.l])), need: 0 };
  };
  sim.upgrade = function (b) {
    var info = sim.upgradeInfo(b);
    if (!info) return { ok: false, reason: 'En yüksek seviyede' };
    if (b.st) return { ok: false, reason: 'Bina meşgul' };
    if (b.dmg) return { ok: false, reason: 'Önce onar' };
    if (info.need > S.lvl) return { ok: false, reason: 'Şehir seviyesi ' + info.need + ' gerekli' };
    if (!sim.canAfford(info.cost)) return { ok: false, reason: 'Yetersiz kaynak' };
    pay(info.cost);
    b.st = 2; b.q = info.time; b.tot = info.time; R.dirty = true;
    return { ok: true };
  };
  sim.repairCost = function (b) { return Math.round((B[b.id].cost.money || 100) * 0.25 * b.l); };
  sim.repair = function (b) {
    var c = sim.repairCost(b);
    if (S.money < c) return { ok: false, reason: 'Yetersiz para' };
    S.money -= c; b.dmg = false; R.dirty = true;
    return { ok: true };
  };
  sim.speedCost = function (b) { return Math.max(10, Math.round(b.q * (1 + S.lvl * 0.6))); };
  sim.speedUp = function (b) {
    if (!b.st) return { ok: false, reason: 'İnşaat yok' };
    var c = sim.speedCost(b);
    if (S.money < c) return { ok: false, reason: 'Yetersiz para' };
    S.money -= c; b.q = 0; finish(b);
    return { ok: true };
  };

  function finish(b, instant) {
    var def = B[b.id];
    if (b.st === 2) {
      b.l++; S.stats.upgrades++;
      if (b.id === 'townhall') { S.th = b.l; sim.addXp(100 * b.l * b.l); }
      else sim.addXp(sim.xpFor(def, b.l));
      CB.emit('built', { b: b, upgrade: true });
    } else {
      S.stats.built++;
      if (def.cat === 'park') S.stats.parks++;
      sim.addXp(sim.xpFor(def, 1));
      CB.emit('built', { b: b, instant: !!instant });
      if (b.id === 'spaceport' && !S.won) { S.won = true; CB.emit('win', {}); }
    }
    b.st = 0; b.q = 0; b.wait = false;
    R.dirty = true;
  }

  /* ================= BÖLGELER ================= */
  sim.regionCost = function () {
    var n = sim.ownedCount() - 4;
    return Math.round(600 * Math.pow(1.14, n) / 50) * 50;
  };
  sim.regionBuyable = function (r) {
    if (S.own[r]) return false;
    var rx = r % 8, ry = (r / 8) | 0;
    return (rx > 0 && S.own[r - 1]) || (rx < 7 && S.own[r + 1]) || (ry > 0 && S.own[r - 8]) || (ry < 7 && S.own[r + 8]);
  };
  sim.buyRegion = function (r) {
    if (!sim.regionBuyable(r)) return { ok: false, reason: 'Sadece komşu bölgeler alınabilir' };
    if (sim.ownedCount() >= D.TH[S.th].regions) return { ok: false, reason: 'Bölge sınırına ulaştın. Belediyeyi yükselt!' };
    var c = sim.regionCost();
    if (S.money < c) return { ok: false, reason: 'Yetersiz para (₺' + CB.fmt(c) + ')' };
    S.money -= c; S.own[r] = 1; sim.addXp(20 + sim.ownedCount() * 8);
    R.dirty = true; CB.emit('region', { r: r });
    return { ok: true };
  };

  /* ================= ARAŞTIRMA / VERGİ ================= */
  sim.techState = function (id) {
    var t = D.TECH[id];
    if (S.techs[id]) return 'done';
    if (t.req && !S.techs[t.req]) return 'locked';
    return S.sci >= t.cost ? 'ready' : 'wait';
  };
  sim.research = function (id) {
    var st = sim.techState(id);
    if (st === 'done') return { ok: false, reason: 'Zaten araştırıldı' };
    if (st === 'locked') return { ok: false, reason: 'Önce: ' + D.TECH[D.TECH[id].req].name };
    if (st === 'wait') return { ok: false, reason: 'Yetersiz bilim puanı' };
    S.sci -= D.TECH[id].cost; S.techs[id] = 1; sim.addXp(40 + D.TECH[id].cost * 0.4);
    R.dirty = true; CB.emit('tech', { id: id });
    return { ok: true };
  };
  sim.techCount = function () { return Object.keys(S.techs).length; };
  sim.setTax = function (v) { S.tax = CB.clamp(Math.round(v), 0, 20); R.dirty = true; };

  /* ================= YENİDEN HESAPLAMA ================= */
  function calcMods() {
    var m = {}, i, k;
    for (i = 0; i < MODKEYS.length; i++) m[MODKEYS[i]] = 0;
    for (var id in S.techs) { var e = D.TECH[id] && D.TECH[id].eff; if (e) for (k in e) if (k !== 'unlock') m[k] += e[k]; }
    m.tax += D.TH[S.th].tax;
    for (i = 0; i < S.bl.length; i++) {
      var b = S.bl[i], g = B[b.id].glob;
      if (g && b.st !== 1 && !b.dmg) for (k in g) m[k] += g[k] * b.l;
    }
    for (i = 0; i < S.effects.length; i++) { var ef = S.effects[i].eff; for (k in ef) m[k] += ef[k]; }
    R.mod = m;
  }

  function calcConn() {
    var conn = R.conn; conn.fill(0);
    var th = null, i;
    for (i = 0; i < S.bl.length; i++) if (S.bl[i].id === 'townhall') { th = S.bl[i]; break; }
    R.th = th;
    if (!th) return;
    var q = [], s = 2;
    function push(x, y) { if (W.inB(x, y)) { var k = W.idx(x, y); if (S.road[k] && !conn[k]) { conn[k] = 1; q.push(k); } } }
    for (i = 0; i < s; i++) { push(th.x + i, th.y - 1); push(th.x + i, th.y + s); push(th.x - 1, th.y + i); push(th.x + s, th.y + i); }
    while (q.length) {
      var k = q.pop(), x = k % N, y = (k / N) | 0;
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    }
  }

  function paint(grid, cx, cy, r, v, mode) {
    var x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(N - 1, Math.ceil(cx + r));
    var y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(N - 1, Math.ceil(cy + r));
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.sqrt(dx * dx + dy * dy);
      if (d > r) continue;
      var i = x + y * N;
      if (mode === 0) { if (grid[i] < v) grid[i] = v; }
      else if (mode === 1) grid[i] += v * (1 - 0.5 * d / (r + 1));
      else grid[i] += v * (1 - d / (r + 1));
    }
  }

  sim.recalc = function () {
    var i, b, def, li, tot = {}, m;
    calcMods(); m = R.mod;
    calcConn();
    var count = {}, jobs = 0, housing = 0, stor = D.TH[S.th].stor, crews = D.TH[S.th].crews, slots = 2, custNeed = 0;
    // 1. geçiş: çalışır durumdaki binalar, iş, konut
    for (i = 0; i < S.bl.length; i++) {
      b = S.bl[i]; def = B[b.id]; li = b.l - 1;
      b.conn = def.noRoad || b.id === 'townhall' || ringConn(b);
      b.ok = b.st !== 1 && !b.dmg && !(b.fire > 0) && b.conn;
      b.bonus = 1;
      if (def.need === 'forest') {
        var n = nearCount(b.x, b.y, def.size, 3, T.FOREST);
        b.bonus = n === 0 ? 0 : CB.clamp(0.5 + n * 0.05, 0.5, 1.5);
      } else if (def.need && nearCount(b.x, b.y, def.size, NEEDR[def.need], NEEDT[def.need]) === 0) b.bonus = 0;
      if (b.st !== 1) count[b.id] = (count[b.id] || 0) + 1;
      if (!b.ok) continue;
      if (def.workers) jobs += def.workers * D.LW[li];
      if (def.cap) housing += def.cap * D.LM[li] * (1 + m.cap);
      if (def.stor) stor += def.stor * D.LM[li];
      if (def.crew) crews += def.crew;
      if (def.slots) slots += def.slots;
      if (def.cust) custNeed += def.cust * D.LM[li];
    }
    stor = Math.round(stor * (1 + m.stor));
    var workforce = S.pop * 0.5;
    var wr = jobs > 0 ? Math.min(1, workforce / jobs) : 1;
    // 2. geçiş: enerji / su
    var pgen = 0, wgen = 0, pdem = 0, wdem = 0;
    for (i = 0; i < S.bl.length; i++) {
      b = S.bl[i]; if (!b.ok) continue; def = B[b.id]; li = b.l - 1;
      var we = def.workers ? (0.25 + 0.75 * wr) : 1;
      if (def.pgen) pgen += def.pgen * D.LM[li] * (1 + m.util) * we;
      if (def.wgen) wgen += def.wgen * D.LM[li] * (1 + m.util) * we;
      if (def.pw) pdem += def.pw * D.LW[li] * (def.cap ? Math.max(0.2, b.pop / (def.cap * D.LM[li])) : 1);
      if (def.wt) wdem += def.wt * D.LW[li] * (def.cap ? Math.max(0.2, b.pop / (def.cap * D.LM[li])) : 1);
    }
    var pr = pdem > 0 ? Math.min(1, pgen / pdem) : 1;
    var wtr = wdem > 0 ? Math.min(1, wgen / wdem) : 1;
    // 3. geçiş: verim
    for (i = 0; i < S.bl.length; i++) {
      b = S.bl[i]; def = B[b.id];
      if (!b.ok) { b.eff = 0; continue; }
      var e = 1;
      if (def.workers) e *= wr;
      if (!def.cap && !def.pgen && !def.wgen) { if (def.pw) e *= pr; if (def.wt) e *= wtr; }
      b.eff = e * b.bonus;
    }
    // kapsama ızgaraları
    var cov = R.cov, k;
    for (k in cov) cov[k].fill(0);
    for (i = 0; i < S.bl.length; i++) {
      b = S.bl[i]; if (!b.ok) continue; def = B[b.id]; li = b.l - 1;
      var cx = b.x + def.size / 2, cy = b.y + def.size / 2;
      if (def.svc) {
        var rr = def.svc.r * D.LR[li] * (1 + m.radius) + def.size / 2 - 0.5;
        var str = 0.5 + 0.5 * b.eff;
        if (def.svc.t === 'leisure') paint(cov.leisure, cx, cy, rr, def.svc.v * [1, 1.4, 1.8][li] * str, 1);
        else paint(cov[def.svc.t], cx, cy, rr, Math.min(1, def.svc.v * D.LR[li]) * str, 0);
      }
      if (def.pol) paint(cov.pol, cx, cy, def.pol.r + def.size / 2, def.pol.v * D.LW[li] * (1 - Math.min(0.8, m.pollution)), 2);
    }
    // konut mutluluğu
    var unemp = workforce > 0 ? Math.max(0, 1 - jobs / workforce) : 0;
    var hunger = S.pop > 0 && S.res.food <= 0;
    var taxEff = S.tax <= 10 ? (10 - S.tax) : -(S.tax - 10) * 2.5;
    var glob = 45 + m.happy + taxEff - (hunger ? 15 : 0) - (S.money < 0 ? 10 : 0);
    if (S.pop >= 60 && unemp > 0.15) glob -= Math.min(12, (unemp - 0.15) * 40);
    var hs = 0, hw = 0, cpol = 0, chealth = 0, cw = 0;
    for (i = 0; i < S.bl.length; i++) {
      b = S.bl[i]; def = B[b.id];
      if (!def.cap) continue;
      if (!b.ok) { b.target = 0; b.h = 0; continue; }
      li = b.l - 1;
      var ti = W.idx(b.x + (def.size >> 1), b.y + (def.size >> 1));
      var h = glob + 8 * cov.police[ti] + 6 * cov.fire[ti] + 10 * cov.health[ti] + 10 * cov.edu[ti] + Math.min(20, cov.leisure[ti]) - Math.min(30, cov.pol[ti]) - 15 * (1 - pr) - 15 * (1 - wtr);
      h = CB.clamp(h, 0, 100);
      b.h = h;
      var cap = def.cap * D.LM[li] * (1 + m.cap);
      b.target = cap * CB.clamp((h - 15) / 45, 0, 1);
      hs += h * cap; hw += cap;
      var pw = Math.max(1, b.pop);
      cpol += cov.police[ti] * pw; chealth += cov.health[ti] * pw; cw += pw;
    }
    tot.jobs = Math.round(jobs); tot.workforce = Math.round(workforce); tot.wr = wr; tot.unemp = unemp;
    tot.pgen = pgen; tot.pdem = pdem; tot.pr = pr; tot.wgen = wgen; tot.wdem = wdem; tot.wtr = wtr;
    tot.housing = Math.round(housing); tot.stor = stor; tot.crews = crews; tot.slots = slots;
    tot.custNeed = custNeed; tot.cr = custNeed > 0 ? Math.min(1, S.pop / custNeed) : 1;
    tot.happy = hw > 0 ? hs / hw : 50; tot.hunger = hunger; tot.glob = glob;
    tot.covPolice = cw > 0 ? cpol / cw : 1; tot.covHealth = cw > 0 ? chealth / cw : 1;
    R.tot = tot; R.count = count;
    R.dirty = false; R.lastCalc = S.t;
    checkAch();
  };

  /* ================= TICK ================= */
  sim.tick = function (dt, offline) {
    dt = dt || 1;
    S.t += dt; S.stats.play += dt;
    if (R.dirty || S.t - R.lastCalc >= (offline ? 60 : 3)) sim.recalc();
    var m = R.mod, tot = R.tot, i, b, def, li, r, k = dt / 60;

    // inşaat
    var used = 0, bm = 1 / Math.max(0.25, 1 - m.build);
    for (i = 0; i < S.bl.length; i++) {
      b = S.bl[i];
      if (!b.st) continue;
      if (used < tot.crews) { used++; b.wait = false; b.q -= dt * bm; if (b.q <= 0) finish(b); }
      else b.wait = true;
    }
    R.busy = used;

    var m0 = S.money, res0 = {}, sci0 = S.sci;
    for (r in S.res) res0[r] = S.res[r];
    var cap = tot.stor, taxInc = 0, comInc = 0, upk = 0, pop = 0;
    var taxK = 2 * (S.tax / 10) * (1 + m.tax);

    for (i = 0; i < S.bl.length; i++) {
      b = S.bl[i]; def = B[b.id]; li = b.l - 1;
      if (b.st !== 1 && def.up) upk += def.up * D.LU[li];
      // yangın
      if (b.fire > 0) {
        var covered = R.cov.fire[W.idx(b.x, b.y)] > 0.3;
        b.fire -= dt * (covered ? 3 : 1);
        if (b.fire <= 0) {
          b.fire = 0; R.dirty = true;
          if (covered) { S.stats.firesOut++; CB.emit('toast', { text: '🚒 İtfaiye yangını söndürdü: ' + def.name, good: true }); }
          else { b.dmg = true; CB.emit('toast', { text: '🔥 ' + def.name + ' yangında hasar gördü! Onarmak için dokun.', bad: true }); }
        }
      }
      if (def.cap) {
        var target = b.ok ? b.target : 0, d = target - b.pop;
        var step = Math.max(0.15, Math.abs(d) * 0.03) * dt;
        if (Math.abs(d) <= step) b.pop = target; else b.pop += d > 0 ? step : -step;
        pop += b.pop;
        taxInc += b.pop * def.tax * taxK;
        continue;
      }
      if (!b.ok || b.eff <= 0) { b.starved = false; continue; }
      var e = b.eff, lm = D.LM[li], supplied = true;
      if (def.cons) {
        for (r in def.cons) if (S.res[r] < def.cons[r] * lm * e * k) { supplied = false; break; }
        if (supplied) for (r in def.cons) S.res[r] -= def.cons[r] * lm * e * k;
      }
      b.starved = !supplied;
      if (def.prod && supplied) {
        for (r in def.prod) {
          if (S.res[r] < cap) S.res[r] = Math.min(cap, S.res[r] + def.prod[r] * lm * e * (1 + m[RESMOD[r]]) * k);
        }
      }
      if (def.inc) comInc += def.inc * lm * e * (def.cust ? tot.cr : 1) * (1 + m.com) * (supplied ? 1 : 0.4);
      if (def.sci) S.sci += def.sci * lm * e * (1 + m.sci) * k;
    }
    upk *= (1 - m.upkeep);
    // gıda tüketimi
    S.res.food = Math.max(0, S.res.food - pop * 0.02 * k);
    S.pop = Math.floor(pop + 0.001);
    var gain = (taxInc + comInc) * k;
    S.money += gain - upk * k;
    S.stats.earned += gain;
    S.stats.sciEarned += S.sci - sci0;
    R.flow.tax = taxInc; R.flow.com = comInc; R.flow.up = upk;

    // oranlar (dakikalık)
    var a = offline ? 1 : 0.15;
    R.rate.money += ((S.money - m0) / k - R.rate.money) * a;
    R.rate.sci += ((S.sci - sci0) / k - R.rate.sci) * a;
    for (r in S.res) R.rate.res[r] += ((S.res[r] - res0[r]) / k - R.rate.res[r]) * a;

    // etkiler
    if (S.effects.length) {
      var n0 = S.effects.length;
      S.effects = S.effects.filter(function (ef) { return ef.until > S.t; });
      if (S.effects.length !== n0) R.dirty = true;
    }

    if (!offline) {
      // yangın çıkışı
      S.nextFire -= dt;
      if (S.nextFire <= 0) { S.nextFire = 420 + Math.random() * 480; if (S.lvl >= 4) startFire(); }
      // rastgele olay
      S.nextEvent -= dt;
      if (S.nextEvent <= 0) { S.nextEvent = 260 + Math.random() * 260; randomEvent(); }
    }
    // sözleşmeler
    updateContracts();
    // periyodik işler
    var minute = Math.floor(S.t / 60);
    if (minute !== R.lastMin) {
      R.lastMin = minute;
      for (r in S.prices) S.prices[r] = CB.clamp(S.prices[r] + (Math.random() - 0.5) * 0.12, 0.7, 1.4);
      S.hist.push([S.pop, Math.round(S.money), Math.round(tot.happy)]);
      if (S.hist.length > 240) S.hist.shift();
      if (!offline) sim.checkDaily();
    }
    // görev
    if (!S.missionDone && S.mission < D.MISSIONS.length) {
      var pg = sim.missionProgress();
      if (pg[0] >= pg[1]) { S.missionDone = true; CB.emit('missionDone', {}); }
    }
  };

  /* ================= YANGIN / OLAYLAR ================= */
  function startFire() {
    var cands = S.bl.filter(function (b) { var d = B[b.id]; return b.st === 0 && !b.dmg && !b.fire && b.id !== 'townhall' && d.cat !== 'wonder' && d.cat !== 'park'; });
    if (cands.length < 6) return;
    var b = cands[(Math.random() * cands.length) | 0];
    b.fire = 24; R.dirty = true;
    CB.emit('fire', { b: b });
  }

  function addEffect(id, name, icon, eff, dur) {
    S.effects = S.effects.filter(function (e) { return e.id !== id; });
    S.effects.push({ id: id, name: name, icon: icon, eff: eff, until: S.t + dur });
    R.dirty = true;
  }
  sim.festivalCost = function () { return Math.round(60 * Math.pow(S.lvl, 1.5) / 10) * 10; };

  function randomEvent() {
    var tot = R.tot;
    var list = D.EVENTS.filter(function (e) {
      if (e.minLvl && S.lvl < e.minLvl) return false;
      if (e.minPop && S.pop < e.minPop) return false;
      if (e.cond === 'hightax') return S.tax >= 14;
      if (e.cond === 'lowpolice') return S.lvl >= 5 && S.pop > 80 && tot.covPolice < 0.4;
      if (e.cond === 'lowhealth') return S.lvl >= 6 && S.pop > 200 && tot.covHealth < 0.4;
      if (e.cond === 'leisure') return S.stats.parks >= 3;
      return true;
    });
    if (!list.length) return;
    var e = list[(Math.random() * list.length) | 0], detail = '';
    if (e.gift === 'money') {
      var amt = Math.round(120 * Math.pow(S.lvl, 1.7) * (0.8 + Math.random() * 0.6) / 10) * 10;
      S.money += amt; detail = '+₺' + CB.fmt(amt);
    } else if (e.gift === 'res') {
      var av = D.RES_ORDER.filter(function (r) { return D.RES[r].lvl <= S.lvl; }), parts = [];
      for (var i = 0; i < 2; i++) {
        var r = av[(Math.random() * av.length) | 0], n = Math.round((20 + S.lvl * 8) * (0.6 + Math.random()));
        var o = {}; o[r] = n; give(o); parts.push('+' + n + ' ' + D.RES[r].icon);
      }
      detail = parts.join('  ');
    } else if (e.gift === 'sci') {
      var sc = 8 * S.lvl; S.sci += sc; detail = '+' + sc + ' 🔬';
    } else if (e.loss === 'money') {
      var l = Math.round(Math.max(0, S.money) * 0.04); S.money -= l; detail = '-₺' + CB.fmt(l);
    } else if (e.eff) {
      addEffect(e.id, e.name, e.icon, e.eff, e.dur);
    }
    CB.emit('event', { ev: e, detail: detail, cost: e.choice === 'festival' ? sim.festivalCost() : 0 });
  }
  sim.acceptFestival = function () {
    var c = sim.festivalCost();
    if (S.money < c) return { ok: false, reason: 'Yetersiz para' };
    S.money -= c; addEffect('festival', 'Festival', '🎉', { happy: 8 }, 600);
    return { ok: true };
  };

  /* ================= SÖZLEŞMELER / PAZAR ================= */
  function genContract() {
    var av = D.RES_ORDER.filter(function (r) { return D.RES[r].lvl <= S.lvl; });
    var V = 110 * Math.pow(S.lvl, 1.5) * (0.7 + Math.random() * 0.8);
    var n = av.length > 1 && Math.random() < 0.55 ? 2 : 1, req = {}, val = 0, cap = sim.storageCap();
    for (var i = 0; i < n; i++) {
      var r = av[(Math.random() * av.length) | 0];
      if (req[r]) continue;
      var amt = Math.max(5, Math.round(V / n / D.RES[r].price / 5) * 5);
      amt = Math.min(amt, Math.floor(cap * 0.8 / 5) * 5);
      req[r] = amt; val += amt * D.RES[r].price;
    }
    return { req: req, val: val, xp: Math.round(3 * Math.pow(val, 0.62)), exp: S.t + 900 + Math.random() * 600 };
  }
  sim.contractMoney = function (c) { return Math.round(c.val * 1.9 * (1 + R.mod.contract) / 10) * 10; };
  function updateContracts() {
    if (S.lvl < 3) return;
    var slots = R.tot.slots || 2;
    for (var i = 0; i < slots; i++) {
      var c = S.contracts[i];
      if (!c || (c.cool && S.t >= c.cool) || (c.exp && S.t >= c.exp)) S.contracts[i] = genContract();
    }
    if (S.contracts.length > slots) S.contracts.length = slots;
  }
  sim.canDeliver = function (c) { if (!c || !c.req) return false; for (var r in c.req) if (S.res[r] < c.req[r]) return false; return true; };
  sim.deliver = function (i) {
    var c = S.contracts[i];
    if (!sim.canDeliver(c)) return { ok: false, reason: 'Yetersiz kaynak' };
    for (var r in c.req) S.res[r] -= c.req[r];
    var money = sim.contractMoney(c);
    S.money += money; S.stats.earned += money; S.stats.contracts++; sim.addXp(c.xp);
    S.contracts[i] = { cool: S.t + 90 + Math.random() * 120 };
    return { ok: true, money: money, xp: c.xp };
  };
  sim.skipContract = function (i) {
    var c = S.contracts[i];
    if (c && c.req) S.contracts[i] = { cool: S.t + 45 };
  };
  sim.hasMarket = function () { return sim.countOf('bazaar') > 0; };
  sim.buyPrice = function (r) { return D.RES[r].price * S.prices[r] * (sim.countOf('port') ? 1.3 : 1.55); };
  sim.sellPrice = function (r) { return D.RES[r].price * S.prices[r] * (sim.countOf('port') ? 0.85 : 0.7); };
  sim.marketBuy = function (r, n) {
    if (!sim.hasMarket()) return { ok: false, reason: 'Pazar Yeri gerekli' };
    n = Math.min(n, Math.floor(sim.storageCap() - S.res[r]));
    if (n <= 0) return { ok: false, reason: 'Depo dolu' };
    var c = Math.ceil(sim.buyPrice(r) * n);
    if (S.money < c) { n = Math.floor(S.money / sim.buyPrice(r)); c = Math.ceil(sim.buyPrice(r) * n); }
    if (n <= 0) return { ok: false, reason: 'Yetersiz para' };
    S.money -= c; S.res[r] += n;
    return { ok: true, n: n, money: c };
  };
  sim.marketSell = function (r, n) {
    if (!sim.hasMarket()) return { ok: false, reason: 'Pazar Yeri gerekli' };
    n = Math.min(n, Math.floor(S.res[r]));
    if (n <= 0) return { ok: false, reason: 'Stok yok' };
    var c = Math.floor(sim.sellPrice(r) * n);
    S.money += c; S.res[r] -= n; S.stats.earned += c;
    return { ok: true, n: n, money: c };
  };

  /* ================= GÖREVLER / GÜNLÜK / BAŞARIMLAR ================= */
  sim.statVal = function (k) {
    switch (k) {
      case 'pop': return S.pop;
      case 'built': return S.stats.built;
      case 'earned': return S.stats.earned;
      case 'roads': return S.stats.roads;
      case 'contracts': return S.stats.contracts;
      case 'techs': return sim.techCount();
      case 'upgrades': return S.stats.upgrades;
      case 'regions': return sim.ownedCount();
      case 'happy500': return S.pop >= 500 ? Math.round(R.tot.happy) : 0;
      case 'happy10k': return S.pop >= 10000 ? Math.round(R.tot.happy) : 0;
      case 'wonders': var c = 0; for (var id in R.count) if (B[id].cat === 'wonder') c += R.count[id]; return c;
      case 'streak': return S.daily.streak;
      case 'firesOut': return S.stats.firesOut;
      case 'parks': return S.stats.parks;
      case 'sci': return S.stats.sciEarned;
    }
    return 0;
  };
  sim.missionProgress = function () {
    var ms = D.MISSIONS[S.mission];
    if (!ms) return [0, 1];
    var g = ms.goal, cur = 0;
    switch (g.t) {
      case 'b': cur = sim.countOf(g.id); break;
      case 'road': var c = 0; for (var i = 0; i < S.road.length; i++) if (S.road[i]) c++; cur = c - 6; break;
      case 'pop': cur = S.pop; break;
      case 'lvl': cur = S.lvl; break;
      case 'happy': cur = S.pop >= 30 ? Math.round(R.tot.happy) : 0; break;
      case 'th': cur = S.th; break;
      case 'reg': cur = sim.ownedCount(); break;
      case 'tech': cur = sim.techCount(); break;
      case 'con': cur = S.stats.contracts; break;
      case 'upg': cur = S.stats.upgrades; break;
      case 'wonder': cur = sim.statVal('wonders'); break;
    }
    return [Math.min(cur, g.n), g.n];
  };
  sim.claimMission = function () {
    if (!S.missionDone) return { ok: false };
    var ms = D.MISSIONS[S.mission];
    give(ms.rew);
    S.mission++; S.missionDone = false;
    return { ok: true, rew: ms.rew };
  };

  function checkAch() {
    for (var i = 0; i < D.ACH.length; i++) {
      var a = D.ACH[i];
      if (S.ach[a.id]) continue;
      if (sim.statVal(a.stat) >= a.n) {
        S.ach[a.id] = 1; sim.addXp(a.xp);
        CB.emit('ach', { a: a });
      }
    }
  }

  var DAILY = {
    built: function (l) { return { n: Math.min(12, 3 + (l >> 2)), text: 'bina inşa et' }; },
    earned: function (l) { return { n: Math.round(300 * Math.pow(l, 1.9) / 100) * 100, text: 'gelir topla', money: true }; },
    roads: function (l) { return { n: 8 + l, text: 'kare yol döşe' }; },
    upgrades: function (l) { return l >= 4 ? { n: 1 + (l >> 3), text: 'bina yükselt' } : null; },
    contracts: function (l) { return l >= 6 ? { n: 1 + ((l / 10) | 0), text: 'sözleşme teslim et' } : null; },
    sci: function (l) { return l >= 6 ? { n: 15 * l, text: 'bilim puanı üret' } : null; }
  };
  sim.checkDaily = function () {
    var today = CB.today(), d = S.daily;
    if (d.date === today) return;
    var diff = CB.dayDiff(d.lastLogin, today);
    d.streak = diff === 1 ? d.streak + 1 : 1;
    d.lastLogin = today; d.date = today; d.loginClaim = false;
    var kinds = Object.keys(DAILY).filter(function (k) { return DAILY[k](S.lvl); });
    d.tasks = [];
    while (d.tasks.length < 3 && kinds.length) {
      var k = kinds.splice((Math.random() * kinds.length) | 0, 1)[0], t = DAILY[k](S.lvl);
      d.tasks.push({ k: k, n: t.n, text: t.text, money: !!t.money, base: sim.statVal(k), claimed: false });
    }
    CB.emit('daily', {});
  };
  sim.dailyProgress = function (t) { return Math.min(t.n, Math.max(0, Math.floor(sim.statVal(t.k) - t.base))); };
  sim.dailyReward = function () { return { money: Math.round(250 * Math.pow(S.lvl, 1.5) / 50) * 50, xp: 30 * S.lvl }; };
  sim.claimDaily = function (i) {
    var t = S.daily.tasks[i];
    if (!t || t.claimed || sim.dailyProgress(t) < t.n) return { ok: false };
    t.claimed = true; var rew = sim.dailyReward(); give(rew);
    return { ok: true, rew: rew };
  };
  sim.loginReward = function () {
    var s = Math.min(S.daily.streak, 7);
    return { money: Math.round(200 * Math.pow(S.lvl, 1.4) * (1 + s * 0.25) / 50) * 50, sci: S.lvl >= 5 ? 5 * S.lvl * s : 0 };
  };
  sim.claimLogin = function () {
    if (S.daily.loginClaim) return { ok: false };
    S.daily.loginClaim = true; var rew = sim.loginReward(); give(rew);
    return { ok: true, rew: rew };
  };

  /* ================= ÇEVRİMDIŞI İLERLEME ================= */
  sim.offline = function (sec) {
    sim.recalc();
    var capH = 8 + (S.techs.gece ? 4 : 0);
    var el = Math.min(sec, capH * 3600);
    if (el < 60) return null;
    var eff = 0.5 + R.mod.offline;
    var m0 = S.money, res0 = {}, r, sci0 = S.sci, pop0 = S.pop, built0 = S.stats.built + S.stats.upgrades;
    for (r in S.res) res0[r] = S.res[r];
    var earned0 = S.stats.earned;
    var step = 10, n = Math.floor(el / step);
    for (var i = 0; i < n; i++) sim.tick(step, true);
    // verim uygula (sadece kazançlara)
    var out = { sec: el, capped: sec > el, eff: eff, res: {}, done: S.stats.built + S.stats.upgrades - built0 };
    var dm = S.money - m0;
    if (dm > 0) { S.money = m0 + dm * eff; S.stats.earned = earned0 + (S.stats.earned - earned0) * eff; }
    out.money = S.money - m0;
    for (r in S.res) { var d = S.res[r] - res0[r]; if (d > 0) { S.res[r] = res0[r] + d * eff; } out.res[r] = S.res[r] - res0[r]; }
    var ds = S.sci - sci0; if (ds > 0) S.sci = sci0 + ds * eff;
    out.sci = S.sci - sci0; out.pop = S.pop - pop0;
    sim.recalc();
    return out;
  };

  /* ================= KAYIT ================= */
  function enc(a) { var s = ''; for (var i = 0; i < a.length; i++) s += a[i]; return s; }
  function dec(s, n) { var a = new Uint8Array(n); for (var i = 0; i < n && i < s.length; i++) a[i] = s.charCodeAt(i) - 48; return a; }
  sim.serialize = function () {
    var o = {}, k;
    for (k in S) if (k !== 'terrain' && k !== 'road' && k !== 'own' && k !== 'bl') o[k] = S[k];
    o.terrain = enc(S.terrain); o.road = enc(S.road); o.own = enc(S.own);
    o.bl = S.bl.map(function (b) {
      var c = { uid: b.uid, id: b.id, x: b.x, y: b.y, l: b.l, st: b.st, q: Math.round(b.q), tot: b.tot, pop: Math.round(b.pop * 10) / 10 };
      if (b.dmg) c.dmg = 1;
      return c;
    });
    o.saved = Date.now();
    return JSON.stringify(o);
  };
  sim.load = function (json) {
    var o = typeof json === 'string' ? JSON.parse(json) : json;
    if (!o || o.v !== 1 || !o.bl || !o.terrain) throw new Error('Geçersiz kayıt');
    var base = sim.newGameTemplate();
    for (var k in base) if (o[k] === undefined) o[k] = base[k];
    for (k in base.stats) if (o.stats[k] === undefined) o.stats[k] = base.stats[k];
    for (k in base.set) if (o.set[k] === undefined) o.set[k] = base.set[k];
    for (k in base.res) if (o.res[k] === undefined) o.res[k] = 0;
    o.terrain = dec(o.terrain, N * N); o.road = dec(o.road, N * N); o.own = dec(o.own, 64);
    o.bl = o.bl.filter(function (b) { return B[b.id]; });
    S = sim.S = o;
    sim.initRuntime();
    return S;
  };
  sim.newGameTemplate = function () {
    return {
      money: 0, res: { food: 0, wood: 0, stone: 0, ore: 0, steel: 0, goods: 0, elec: 0 }, xp: 0, lvl: 1, tax: 10, th: 1, pop: 0, sci: 0,
      uid: 1, techs: {}, mission: 0, missionDone: false,
      daily: { date: '', tasks: [], streak: 0, lastLogin: '', loginClaim: true },
      ach: {}, stats: { built: 0, earned: 0, roads: 0, contracts: 0, upgrades: 0, firesOut: 0, sciEarned: 0, play: 0, parks: 0 },
      effects: [], contracts: [], prices: { food: 1, wood: 1, stone: 1, ore: 1, steel: 1, goods: 1, elec: 1 },
      speed: 1, hist: [], nextEvent: 240, nextFire: 600, won: false, set: { sound: true, night: true, haptic: true }, name: 'Yeni Kent', t: 0
    };
  };

  /* bina bilgi satırları (UI için) */
  sim.problems = function (b) {
    var def = B[b.id], p = [];
    if (b.st === 1) return p;
    if (b.dmg) p.push({ i: '🔧', t: 'Hasarlı - onarım gerekli' });
    if (b.fire > 0) p.push({ i: '🔥', t: 'Yanıyor!' });
    if (!b.conn) p.push({ i: '🚧', t: 'Yola bağlı değil' });
    if (b.bonus === 0) p.push({ i: '❌', t: NEEDNAME[def.need] });
    if (b.ok) {
      if (def.workers && R.tot.wr < 0.6) p.push({ i: '👷', t: 'İşçi yetersiz' });
      if (def.pw && R.tot.pr < 0.8) p.push({ i: '⚡', t: 'Elektrik yetersiz' });
      if (def.wt && R.tot.wtr < 0.8) p.push({ i: '💧', t: 'Su yetersiz' });
      if (b.starved) p.push({ i: '📦', t: 'Hammadde yok' });
      if (def.cust && R.tot.cr < 0.6) p.push({ i: '🛒', t: 'Müşteri az' });
      if (def.cap && b.h < 35) p.push({ i: '😡', t: 'Sakinler mutsuz' });
    }
    return p;
  };
})();
