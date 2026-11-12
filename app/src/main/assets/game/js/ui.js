'use strict';
/* Kent Ustası - arayüz: HUD, inşa menüsü, paneller, popup'lar */
(function () {
  var D = CB.D, B = D.B, sim = CB.sim, R = CB.render, I = CB.input, art = CB.art;
  var ui = CB.ui = {};
  var $ = function (id) { return document.getElementById(id); };
  var el = {}, S, cat = 'res', panel = null, tab = null, popQ = [], popOpen = false, popCb = null;
  var OVERLAYS = [['', 'Kapalı'], ['happy', '😊 Mutluluk'], ['pol', '🏭 Kirlilik'], ['police', '👮 Polis'], ['fire', '🚒 İtfaiye'], ['health', '🏥 Sağlık'], ['edu', '🎓 Eğitim'], ['leisure', '🌳 Eğlence']];

  /* ================= yardımcılar ================= */
  function costHtml(cost, extra) {
    var s = '', m = (cost.money || 0) + (extra || 0);
    if (m) s += '<span class="c' + (S.money < m ? ' no' : '') + '">₺' + CB.fmt(m) + '</span>';
    D.RES_ORDER.forEach(function (r) { if (cost[r]) s += '<span class="c' + (S.res[r] < cost[r] ? ' no' : '') + '">' + D.RES[r].icon + CB.fmt(cost[r]) + '</span>'; });
    return s || '<span class="c">Ücretsiz</span>';
  }
  function rewHtml(rew) {
    var s = '';
    if (rew.money) s += '<span>💰 ₺' + CB.fmt(rew.money) + '</span>';
    if (rew.xp) s += '<span>⭐ ' + CB.fmt(rew.xp) + ' XP</span>';
    if (rew.sci) s += '<span>🔬 ' + CB.fmt(rew.sci) + '</span>';
    D.RES_ORDER.forEach(function (r) { if (rew[r]) s += '<span>' + D.RES[r].icon + ' ' + rew[r] + '</span>'; });
    return s;
  }
  function num(v) { return (Math.round(v * 10) / 10).toString().replace('.', ','); }
  function defStats(def, l) {
    var li = (l || 1) - 1, lm = D.LM[li], a = [], r;
    if (def.cap) a.push('👥 ' + Math.round(def.cap * lm) + ' kişi');
    if (def.workers) a.push('👷 ' + Math.round(def.workers * D.LW[li]) + ' işçi');
    if (def.inc) a.push('💰 +' + CB.fmt(def.inc * lm) + '/dk');
    if (def.prod) for (r in def.prod) a.push(D.RES[r].icon + ' +' + num(def.prod[r] * lm) + '/dk');
    if (def.cons) for (r in def.cons) a.push(D.RES[r].icon + ' -' + num(def.cons[r] * lm) + '/dk');
    if (def.pgen) a.push('⚡ +' + Math.round(def.pgen * lm));
    if (def.wgen) a.push('💧 +' + Math.round(def.wgen * lm));
    if (def.pw) a.push('⚡ -' + Math.round(def.pw * D.LW[li]));
    if (def.wt) a.push('💧 -' + Math.round(def.wt * D.LW[li]));
    if (def.sci) a.push('🔬 +' + num(def.sci * lm) + '/dk');
    if (def.stor) a.push('📦 +' + Math.round(def.stor * lm) + ' depo');
    if (def.svc) a.push('🎯 menzil ' + num(def.svc.r * D.LR[li]));
    if (def.pol) a.push('🏭 kirlilik');
    if (def.crew) a.push('🏗️ +1 ekip');
    if (def.up) a.push('🧾 -' + CB.fmt(def.up * D.LU[li]) + '/dk');
    return a;
  }
  var urlCache = {};
  function spriteUrl(b) {
    var k = b.id + '|' + b.l + '|' + art.variantOf(b);
    return urlCache[k] || (urlCache[k] = art.sprite(b.id, b.l, art.variantOf(b), false).c.toDataURL());
  }
  function stars(l, max) { var s = ''; for (var i = 1; i <= max; i++) s += i <= l ? '★' : '☆'; return s; }

  ui.toast = function (text, kind) {
    var t = document.createElement('div');
    t.className = 'toast' + (kind ? ' ' + kind : ''); t.textContent = text;
    el.toasts.appendChild(t);
    while (el.toasts.children.length > 3) el.toasts.removeChild(el.toasts.firstChild);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 420); }, 2800);
  };

  /* ================= HUD ================= */
  ui.hud = function () {
    S = sim.S; var tot = sim.R.tot, rate = sim.R.rate;
    el.lvl.textContent = S.lvl;
    el.xp.style.width = Math.min(100, S.xp / D.xpNeed(S.lvl) * 100) + '%';
    el.money.textContent = '₺' + CB.fmt(S.money);
    el.mrate.textContent = CB.fmtRate(rate.money) + '/dk'; el.mrate.className = rate.money < -0.05 ? 'neg' : '';
    el.pop.textContent = CB.fmt(S.pop);
    var h = Math.round(tot.happy);
    el.happy.textContent = '%' + h; el.face.textContent = h >= 75 ? '😄' : h >= 55 ? '🙂' : h >= 35 ? '😐' : '😡';
    // ikinci satır
    var s = '<span class="rchip' + (tot.pr < 0.95 ? ' warn' : '') + '">⚡ ' + Math.round(tot.pdem) + '/' + Math.round(tot.pgen) + '</span>' +
      '<span class="rchip' + (tot.wtr < 0.95 ? ' warn' : '') + '">💧 ' + Math.round(tot.wdem) + '/' + Math.round(tot.wgen) + '</span>';
    if (S.sci >= 1 || S.lvl >= 5) s += '<span class="rchip">🔬 ' + CB.fmt(S.sci) + '</span>';
    D.RES_ORDER.forEach(function (r) {
      if (D.RES[r].lvl > S.lvl && S.res[r] < 1) return;
      var v = S.res[r], full = v >= tot.stor - 0.5;
      s += '<span class="rchip' + (r === 'food' && tot.hunger ? ' warn' : full ? ' full' : '') + '">' + D.RES[r].icon + ' ' + CB.fmt(v) + '</span>';
    });
    if (el.top2._h !== s) { el.top2.innerHTML = s; el.top2._h = s; }
    // görev
    var ms = D.MISSIONS[S.mission], m;
    if (!ms) m = '<div class="t">🏆 Tüm görevler tamamlandı!</div>';
    else if (S.missionDone) m = '<div class="t">🎁 ' + ms.title + '</div><div class="h">Tamamlandı! Ödülü almak için dokun.</div>';
    else { var pg = sim.missionProgress(); m = '<div class="t">📋 ' + ms.title + ' <span style="opacity:.8">' + CB.fmt(pg[0]) + '/' + CB.fmt(pg[1]) + '</span></div><div class="h">' + ms.hint + '</div><div class="pb"><i style="width:' + (pg[0] / pg[1] * 100) + '%"></i></div>'; }
    if (el.mission._h !== m) { el.mission.innerHTML = m; el.mission._h = m; el.mission.className = S.missionDone ? 'done' : ''; }
    // etkiler
    var e = '';
    S.effects.forEach(function (f) { var bad = false; for (var k in f.eff) if (f.eff[k] < 0) bad = true; e += '<div class="eff' + (bad ? ' bad' : '') + '">' + f.icon + ' ' + CB.fmtTime(f.until - S.t) + '</div>'; });
    if (sim.R.busy) e += '<div class="eff">🏗️ ' + sim.R.busy + '/' + tot.crews + '</div>';
    if (el.effects._h !== e) { el.effects.innerHTML = e; el.effects._h = e; }
    // rozetler
    var dm = (S.missionDone ? 1 : 0) + (S.daily.loginClaim ? 0 : 1);
    S.daily.tasks.forEach(function (t) { if (!t.claimed && sim.dailyProgress(t) >= t.n) dm++; });
    dot(el.dMissions, dm);
    var dr = 0; D.TECH_ORDER.forEach(function (id) { if (sim.techState(id) === 'ready') dr++; }); dot(el.dResearch, dr);
    var dt = 0; S.contracts.forEach(function (c) { if (sim.canDeliver(c)) dt++; }); dot(el.dTrade, dt);
    el.speed.textContent = ['⏸', '▶', '▶▶', '▶▶▶'][S.speed]; el.speed.style.fontSize = S.speed > 1 ? '11px' : '';
    el.speed.classList.toggle('on', S.speed !== 1);
    el.bOverlay.classList.toggle('on', !!R.overlay);
    el.bExpand.classList.toggle('on', I.mode === 'expand');
  };
  function dot(d, n) { d.textContent = n; d.classList.toggle('show', n > 0); }

  /* ================= İNŞA MENÜSÜ ================= */
  function openBuild() {
    closeInfo(); el.ovmenu.classList.add('hidden');
    el.buildbar.classList.remove('hidden'); el.bBuild.classList.add('on');
    el.bBuild.querySelector('em').textContent = 'Kapat'; el.bBuild.querySelector('span').textContent = '✖️';
    renderCats(); renderCards();
  }
  function closeBuild() {
    el.buildbar.classList.add('hidden'); el.bBuild.classList.remove('on');
    el.bBuild.querySelector('em').textContent = 'İnşa'; el.bBuild.querySelector('span').textContent = '🏗️';
    if (I.mode === 'place' || I.mode === 'paint') I.cancel();
  }
  function buildOpen() { return !el.buildbar.classList.contains('hidden'); }
  function renderCats() {
    el.cats.innerHTML = D.CATS.map(function (c) { return '<button data-act="cat" data-arg="' + c.id + '" class="' + (c.id === cat ? 'on' : '') + '">' + c.icon + ' ' + c.name + '</button>'; }).join('');
  }
  function renderCards() {
    S = sim.S;
    var h = D.ORDER.filter(function (id) { return B[id].cat === cat && !B[id].hidden; }).map(function (id) {
      var def = B[id], lock = sim.lockReason(def), cnt = def.max ? sim.totalOf(id) + '/' + def.max : '';
      return '<div class="card' + (lock ? ' locked' : '') + (I.tool === id ? ' on' : '') + '" data-act="pick" data-arg="' + id + '">' +
        '<div class="im"><img src="' + art.thumb(id) + '"></div>' + (cnt ? '<div class="cnt">' + cnt + '</div>' : '') +
        (lock ? '<div class="lock"><span>🔒 ' + lock + '</span></div>' : '') +
        '<div class="nm">' + def.name + '</div><div class="cs">' + (id === 'bulldoze' ? '<span class="c">Sürükle</span>' : costHtml(def.cost)) + '</div></div>';
    }).join('');
    if (el.cards._h !== h) { el.cards.innerHTML = h; el.cards._h = h; }
  }
  function renderPlacebar() {
    S = sim.S;
    var id = I.tool, g = R.ghost;
    if (!id || (I.mode !== 'place' && I.mode !== 'paint')) { el.placebar.classList.add('hidden'); return; }
    var def = B[id], h;
    el.placebar.classList.remove('hidden');
    if (buildOpen()) el.buildbar.classList.add('hidden');
    if (I.mode === 'paint') {
      h = '<div class="tx"><div class="nm">' + def.name + (def.cost.money ? ' · ₺' + def.cost.money + '/kare' : '') + '</div><div class="ds">' + def.desc + '</div><div class="ds"><b>Tek parmak:</b> çiz · <b>İki parmak:</b> haritayı kaydır</div></div>' +
        '<button class="rbtn ok" data-act="placeDone">✔</button>';
    } else {
      var st = defStats(def, g.move ? g.move.l : 1).map(function (x) { return '<span>' + x + '</span>'; }).join('');
      var rs = g.x === null ? '<div class="ds"><b>Yer seçmek için haritaya dokun.</b></div>' : (g.ok ? '<div class="ds"><b>Onaylamak için ✔ ya da binaya tekrar dokun.</b></div>' : '<div class="rs">⚠ ' + g.reason + '</div>');
      h = '<div class="tx"><div class="nm">' + (g.move ? 'Taşı: ' : '') + def.name + ' <span style="font-weight:500;font-size:11.5px">' + (g.move ? '' : costHtml(def.cost, (g.trees || 0) * 15)) + '</span></div>' +
        '<div class="st">' + st + '</div>' + rs + '</div>' +
        '<button class="rbtn no" data-act="placeCancel">✖</button><button class="rbtn ' + (g.ok && g.x !== null ? 'ok' : 'dis') + '" data-act="placeOk">✔</button>';
    }
    if (el.placebar._h !== h) { el.placebar.innerHTML = h; el.placebar._h = h; }
  }

  /* ================= BİNA BİLGİ KARTI ================= */
  function closeInfo() { R.sel = null; el.info.classList.add('hidden'); }
  function renderInfo() {
    var b = R.sel; S = sim.S;
    if (!b || S.bl.indexOf(b) < 0) { closeInfo(); return; }
    var def = B[b.id], max = sim.maxLvl(def), tot = sim.R.tot, h, sub = def.desc, st = [], btn = '';
    if (b.id === 'townhall') sub = D.TH[b.l].name + ' · Ekip: ' + tot.crews + ' · Bölge sınırı: ' + D.TH[b.l].regions;
    h = '<div class="ih"><div class="im"><img src="' + spriteUrl(b) + '"></div><div><span class="nm">' + def.name + '</span>' +
      (max > 1 ? '<span class="stars">' + (b.id === 'townhall' ? 'Sv.' + b.l : stars(b.l, max)) + '</span>' : '') + '<div class="sub">' + sub + '</div></div><button class="x" data-act="deselect">✕</button></div>';
    if (b.st) {
      var p = b.tot > 0 ? 1 - b.q / b.tot : 1;
      h += '<div class="stats"><span class="stat">' + (b.wait ? '⏳ Ekip bekleniyor (boş ekip yok)' : (b.st === 1 ? '🏗️ İnşa ediliyor' : '⬆️ Yükseltiliyor') + ' · ' + CB.fmtTime(b.q / Math.max(0.25, 1 / (1 / Math.max(0.25, 1 - sim.R.mod.build))))) + '</span></div>' +
        '<div class="pbar gold"><i style="width:' + (p * 100) + '%"></i></div>';
      var sc = sim.speedCost(b);
      btn += '<button class="btn gold' + (S.money < sc ? ' dis' : '') + '" data-act="speedUp">⚡ Hemen Bitir<small>₺' + CB.fmt(sc) + '</small></button>';
      if (b.st === 1) btn += '<button class="btn ghost" data-act="demolish">İptal<small>+₺' + CB.fmt(sim.refund(b)) + '</small></button>';
    } else {
      if (def.cap) { st.push('👥 ' + Math.round(b.pop) + '/' + Math.round(def.cap * D.LM[b.l - 1] * (1 + sim.R.mod.cap))); st.push((b.h >= 60 ? '😊' : b.h >= 35 ? '😐' : '😡') + ' %' + Math.round(b.h || 0)); }
      else if (def.workers || def.prod || def.inc) st.push('⚙️ Verim %' + Math.round((b.eff || 0) * 100));
      st = st.concat(defStats(def, b.l).filter(function (x) { return x.indexOf('kişi') < 0; }));
      if (def.need === 'forest' && b.bonus > 0) st.push('🌲 Orman bonusu ×' + num(b.bonus));
      if (def.glob) st.push('🌟 Şehir geneli bonus');
      h += '<div class="stats">' + st.map(function (x) { return '<span class="stat">' + x + '</span>'; }).join('') + '</div>';
      var pr = sim.problems(b);
      if (pr.length) h += '<div class="probs">' + pr.map(function (x) { return '<div class="prob">' + x.i + ' ' + x.t + '</div>'; }).join('') + '</div>';
      if (b.dmg) { var rc = sim.repairCost(b); btn += '<button class="btn green' + (S.money < rc ? ' dis' : '') + '" data-act="repair">🔧 Onar<small>₺' + CB.fmt(rc) + '</small></button>'; }
      var up = sim.upgradeInfo(b);
      if (up && !b.dmg) {
        var can = sim.canAfford(up.cost) && up.need <= S.lvl;
        btn += '<button class="btn blue' + (can ? '' : ' dis') + '" data-act="upgrade">⬆️ Yükselt' + (up.name ? ' → ' + up.name : '') + '<small>' + (up.need > S.lvl ? '🔒 Şehir seviyesi ' + up.need + ' · ' : '') + costHtml(up.cost) + ' · ⏱' + CB.fmtTime(up.time) + '</small></button>';
      }
      btn += '<button class="btn ghost sm" data-act="moveB">↔️ Taşı</button>';
      if (b.id !== 'townhall') btn += '<button class="btn red sm" data-act="demolish">🗑️ Yık</button>';
    }
    h += '<div class="btns">' + btn + '</div>';
    if (el.info._h !== h) { el.info.innerHTML = h; el.info._h = h; }
    el.info.classList.remove('hidden');
  }

  /* ================= MODAL PANELLER ================= */
  var PANELS = {
    missions: { title: '📋 Görevler', tabs: [['main', 'Ana Görev'], ['daily', 'Günlük'], ['ach', 'Başarımlar']] },
    research: { title: '🔬 Araştırma', tabs: [] },
    trade: { title: '🚢 Ticaret', tabs: [['con', 'Sözleşmeler'], ['market', 'Pazar']] },
    city: { title: '🏙️ Şehir', tabs: [['sum', 'Özet'], ['budget', 'Bütçe'], ['store', 'Depo'], ['chart', 'Grafik']] },
    menu: { title: '⚙️ Menü', tabs: [['set', 'Ayarlar'], ['help', 'Nasıl Oynanır'], ['save', 'Kayıt']] }
  };
  function openPanel(arg) {
    var p = arg.split(':'), def = PANELS[p[0]];
    panel = p[0]; tab = p[1] || (def.tabs.length ? def.tabs[0][0] : null);
    closeInfo(); if (buildOpen()) closeBuild(); if (I.mode !== 'idle') I.cancel();
    el.mTitle.textContent = def.title;
    el.modal.classList.remove('hidden');
    renderTabs(); renderPanel(true);
    CB.emit('sfx', 'open');
  }
  function closeModal() { panel = null; el.modal.classList.add('hidden'); }
  function renderTabs() {
    el.mTabs.innerHTML = PANELS[panel].tabs.map(function (t) { return '<button data-act="tab" data-arg="' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + t[1] + '</button>'; }).join('');
  }
  function renderPanel(force) {
    if (!panel) return;
    S = sim.S;
    var key = panel + ':' + tab;
    if (!force && (key === 'city:budget' || key === 'menu:save' || key === 'menu:help' || key === 'menu:set' || key === 'city:chart')) { if (key === 'city:budget') updateBudget(); return; }
    var h = VIEW[panel](), st = el.mBody.scrollTop;
    if (el.mBody._h !== h || force) { el.mBody.innerHTML = h; el.mBody._h = h; el.mBody.scrollTop = force ? 0 : st; }
    if (key === 'city:chart') drawCharts();
  }

  var VIEW = {};
  VIEW.missions = function () {
    var h = '', i;
    if (tab === 'main') {
      var ms = D.MISSIONS[S.mission];
      if (!ms) h += '<div class="row hl"><h3>🏆 Tebrikler Başkan!</h3><p>Tüm ana görevleri tamamladın. Şehrini büyütmeye, başarımları toplamaya devam et.</p></div>';
      else {
        var pg = sim.missionProgress();
        h += '<div class="row hl"><h3>' + (S.missionDone ? '🎁 ' : '🎯 ') + ms.title + '</h3><p>' + ms.hint + '</p>' +
          '<div class="pbar green"><i style="width:' + (pg[0] / pg[1] * 100) + '%"></i></div><p><b>' + CB.fmt(pg[0]) + ' / ' + CB.fmt(pg[1]) + '</b></p>' +
          '<div class="rew">' + rewHtml(ms.rew) + '</div>' +
          '<div class="btns"><button class="btn ' + (S.missionDone ? 'green' : 'dis') + '" data-act="claimMission">' + (S.missionDone ? 'Ödülü Al' : 'Devam ediyor…') + '</button></div></div>';
        h += '<div class="tier">Sıradaki görevler</div>';
        for (i = S.mission + 1; i < Math.min(D.MISSIONS.length, S.mission + 5); i++) h += '<div class="row done"><h3>🔒 ' + D.MISSIONS[i].title + '</h3><div class="rew">' + rewHtml(D.MISSIONS[i].rew) + '</div></div>';
      }
      h += '<div class="note">Tamamlanan: ' + S.mission + ' / ' + D.MISSIONS.length + '</div>';
    } else if (tab === 'daily') {
      var lr = sim.loginReward();
      h += '<div class="row' + (S.daily.loginClaim ? ' done' : ' hl') + '"><h3>📅 Günlük Giriş · ' + S.daily.streak + '. gün</h3><p>Her gün giriş yap, seri büyüdükçe ödül artsın (7. güne kadar).</p><div class="rew">' + rewHtml(lr) + '</div>' +
        '<div class="btns"><button class="btn ' + (S.daily.loginClaim ? 'dis' : 'green') + '" data-act="claimLogin">' + (S.daily.loginClaim ? 'Alındı ✔' : 'Ödülü Al') + '</button></div></div>';
      var dr = sim.dailyReward();
      S.daily.tasks.forEach(function (t, ix) {
        var p = sim.dailyProgress(t), ok = p >= t.n;
        h += '<div class="row' + (t.claimed ? ' done' : ok ? ' hl' : '') + '"><h3>' + (t.money ? '₺' : '') + CB.fmt(t.n) + ' ' + t.text + '</h3><div class="pbar green"><i style="width:' + (p / t.n * 100) + '%"></i></div>' +
          '<div class="line"><div class="f"><p><b>' + CB.fmt(p) + ' / ' + CB.fmt(t.n) + '</b></p><div class="rew">' + rewHtml(dr) + '</div></div>' +
          '<button class="btn sm ' + (t.claimed ? 'dis' : ok ? 'green' : 'dis') + '" data-act="claimDaily" data-arg="' + ix + '">' + (t.claimed ? 'Alındı ✔' : 'Al') + '</button></div></div>';
      });
      h += '<div class="note">Günlük görevler her gün yenilenir.</div>';
    } else {
      var done = 0; D.ACH.forEach(function (a) { if (S.ach[a.id]) done++; });
      h += '<div class="note">Kazanılan: ' + done + ' / ' + D.ACH.length + '</div>';
      D.ACH.forEach(function (a) {
        var v = Math.min(a.n, sim.statVal(a.stat)), ok = !!S.ach[a.id];
        h += '<div class="row' + (ok ? ' hl' : '') + '"><h3>' + (ok ? '🏅 ' : '▫️ ') + a.name + '</h3><p>' + a.desc + '</p>' + (ok ? '' : '<div class="pbar gold"><i style="width:' + (v / a.n * 100) + '%"></i></div>') + '<div class="rew"><span>⭐ ' + CB.fmt(a.xp) + ' XP</span></div></div>';
      });
    }
    return h;
  };
  VIEW.research = function () {
    var h = '<div class="sci"><div>🔬 ' + CB.fmt(S.sci) + ' bilim puanı</div><small>' + CB.fmtRate(sim.R.rate.sci) + '/dk</small></div>';
    if (sim.R.rate.sci < 0.05 && S.sci < 30) h += '<div class="note">Bilim puanı üretmek için <b>İlkokul</b> (Sv.5), <b>Kütüphane</b> (Sv.9) gibi binalar kur. Olaylardan ve günlük girişten de puan gelir.</div>';
    var tier = 0, names = ['', 'I. Temel', 'II. Gelişim', 'III. Endüstri', 'IV. Modern Çağ', 'V. Gelecek'];
    D.TECH_ORDER.forEach(function (id) {
      var t = D.TECH[id], st = sim.techState(id);
      if (t.tier !== tier) { tier = t.tier; h += '<div class="tier">' + names[tier] + '</div>'; }
      h += '<div class="row' + (st === 'done' ? ' done' : st === 'ready' ? ' hl' : '') + '"><div class="line"><div class="f"><h3>' + (st === 'done' ? '✅ ' : st === 'locked' ? '🔒 ' : '') + t.name + '</h3><p>' + t.desc + (st === 'locked' ? ' · Önce: <b>' + D.TECH[t.req].name + '</b>' : '') + '</p></div>' +
        (st === 'done' ? '' : '<button class="btn sm ' + (st === 'ready' ? 'green' : 'dis') + '" data-act="research" data-arg="' + id + '">🔬 ' + CB.fmt(t.cost) + '</button>') + '</div></div>';
    });
    return h;
  };
  VIEW.trade = function () {
    var h = '';
    if (tab === 'con') {
      if (S.lvl < 3) return '<div class="note">Sözleşmeler <b>Seviye 3</b>\'te açılır.</div>';
      h += '<div class="note">Diğer şehirlerin siparişlerini depondaki kaynaklarla karşıla, para ve XP kazan.</div>';
      S.contracts.forEach(function (c, ix) {
        if (!c) return;
        if (c.cool) { h += '<div class="row done"><h3>📭 Yeni sözleşme bekleniyor</h3><p>' + CB.fmtTime(c.cool - S.t) + ' sonra</p></div>'; return; }
        var can = sim.canDeliver(c), rq = '';
        for (var r in c.req) rq += '<span class="stat"' + (S.res[r] < c.req[r] ? ' style="color:#c23a2a"' : '') + '>' + D.RES[r].icon + ' ' + CB.fmt(Math.min(S.res[r], c.req[r])) + '/' + CB.fmt(c.req[r]) + ' ' + D.RES[r].name + '</span>';
        h += '<div class="row' + (can ? ' hl' : '') + '"><h3>📜 Sipariş #' + (ix + 1) + '</h3><div class="stats">' + rq + '</div><div class="rew"><span>💰 ₺' + CB.fmt(sim.contractMoney(c)) + '</span><span>⭐ ' + CB.fmt(c.xp) + ' XP</span><span style="color:#8a8273">⏱ ' + CB.fmtTime(c.exp - S.t) + '</span></div>' +
          '<div class="btns"><button class="btn ' + (can ? 'green' : 'dis') + '" data-act="deliver" data-arg="' + ix + '">Teslim Et</button><button class="btn ghost sm" data-act="skipContract" data-arg="' + ix + '">Vazgeç</button></div></div>';
      });
      h += '<div class="note">' + (sim.countOf('port') ? '' : '⚓ <b>Liman</b> (Sv.15): +2 sözleşme, +%25 ödül. ') + (sim.countOf('airport') ? '' : '✈️ <b>Havalimanı</b> (Sv.28): +2 sözleşme, +%40 ödül.') + '</div>';
    } else {
      if (!sim.hasMarket()) return '<div class="note">Kaynak alıp satmak için bir <b>Pazar Yeri</b> kur (Özel sekmesi, Seviye 6).</div>';
      h += '<div class="note">Fiyatlar zamanla değişir. ' + (sim.countOf('port') ? 'Liman sayesinde fiyatlar daha iyi.' : 'Liman kurarsan fiyatlar iyileşir.') + ' Depo: ' + CB.fmt(sim.storageCap()) + '</div>';
      D.RES_ORDER.forEach(function (r) {
        if (D.RES[r].lvl > S.lvl) return;
        var tr = S.prices[r] > 1.1 ? '📈' : S.prices[r] < 0.9 ? '📉' : '➖';
        h += '<div class="row"><h3>' + D.RES[r].icon + ' ' + D.RES[r].name + ' <span style="font-weight:500;font-size:12px;color:#7b7466">' + CB.fmt(S.res[r]) + ' adet ' + tr + '</span></h3>' +
          '<div class="btns"><button class="btn blue sm" data-act="buy" data-arg="' + r + '|10">Al 10<small>₺' + CB.fmt(Math.ceil(sim.buyPrice(r) * 10)) + '</small></button><button class="btn blue sm" data-act="buy" data-arg="' + r + '|100">Al 100<small>₺' + CB.fmt(Math.ceil(sim.buyPrice(r) * 100)) + '</small></button>' +
          '<button class="btn gold sm" data-act="sell" data-arg="' + r + '|10">Sat 10<small>₺' + CB.fmt(Math.floor(sim.sellPrice(r) * 10)) + '</small></button><button class="btn gold sm" data-act="sell" data-arg="' + r + '|100">Sat 100<small>₺' + CB.fmt(Math.floor(sim.sellPrice(r) * 100)) + '</small></button></div></div>';
      });
    }
    return h;
  };
  function kv(k, v, cls) { return '<div class="kv"><span>' + k + '</span><b class="' + (cls || '') + '">' + v + '</b></div>'; }
  function advice() {
    var tot = sim.R.tot, a = [];
    if (tot.pr < 0.95) a.push('⚡ Elektrik yetmiyor: yeni santral kur.');
    if (tot.wtr < 0.95) a.push('💧 Su yetmiyor: su kulesi / pompa kur.');
    if (tot.hunger) a.push('🍞 Gıda bitti! Çiftlik kur ya da pazardan al.');
    if (S.money < 0) a.push('💸 Kasa ekside: vergiyi artır ya da gideri azalt.');
    if (tot.jobs > tot.workforce * 1.15) a.push('👷 İşçi açığı var: daha fazla konut kur.');
    if (S.pop >= 60 && tot.unemp > 0.15) a.push('🧑‍💼 İşsizlik yüksek: iş yeri (ticaret/sanayi) kur.');
    if (tot.cr < 0.8) a.push('🛒 Dükkânlar müşteri bekliyor: nüfusu artır.');
    if (tot.happy < 50 && S.pop > 30) a.push('😐 Mutluluk düşük: park, polis, sağlık, okul kur; vergiyi düşür.');
    if (S.pop >= tot.housing * 0.95 && tot.happy >= 60) a.push('🏠 Konutlar doldu: yeni konut kur ya da mevcutları yükselt.');
    if (sim.ownedCount() >= D.TH[S.th].regions && S.th < 10) a.push('🧭 Bölge sınırına ulaştın: Belediyeyi yükselt.');
    if (!a.length) a.push('✅ Her şey yolunda görünüyor, Başkan!');
    return a;
  }
  VIEW.city = function () {
    var tot = sim.R.tot, fl = sim.R.flow, h = '';
    if (tab === 'sum') {
      h += '<div class="row"><div class="line"><div class="f"><h3>🏛️ ' + S.name + '</h3><p>' + D.TH[S.th].name + ' · Seviye ' + S.lvl + ' · ' + (Math.floor(S.t / D.TICKS_DAY) + 1) + '. gün</p></div><button class="btn ghost sm" data-act="rename">✏️ Ad</button></div>' +
        '<div class="pbar gold"><i style="width:' + (S.xp / D.xpNeed(S.lvl) * 100) + '%"></i></div><p>⭐ ' + CB.fmt(S.xp) + ' / ' + CB.fmt(D.xpNeed(S.lvl)) + ' XP</p></div>';
      h += '<div class="row"><h3>🧑‍💼 Danışman</h3>' + advice().map(function (x) { return '<p>' + x + '</p>'; }).join('') + '</div>';
      h += '<div class="row">' + kv('👥 Nüfus / Konut', CB.fmt(S.pop) + ' / ' + CB.fmt(tot.housing)) + kv('👷 İş / İşgücü', CB.fmt(tot.jobs) + ' / ' + CB.fmt(tot.workforce)) +
        kv('😊 Mutluluk', '%' + Math.round(tot.happy)) + kv('⚡ Elektrik (talep / üretim)', Math.round(tot.pdem) + ' / ' + Math.round(tot.pgen), tot.pr < 0.95 ? 'neg' : '') + kv('💧 Su (talep / üretim)', Math.round(tot.wdem) + ' / ' + Math.round(tot.wgen), tot.wtr < 0.95 ? 'neg' : '') +
        kv('🏗️ İnşaat ekibi', (sim.R.busy || 0) + ' / ' + tot.crews) + kv('🧭 Bölge', sim.ownedCount() + ' / ' + D.TH[S.th].regions) + kv('🏢 Bina sayısı', S.bl.length) + kv('⏱ Oynama süresi', CB.fmtTime(S.stats.play)) + '</div>';
      if (S.effects.length) h += '<div class="row"><h3>✨ Aktif etkiler</h3>' + S.effects.map(function (e) { return '<p>' + e.icon + ' ' + e.name + ' · ' + CB.fmtTime(e.until - S.t) + '</p>'; }).join('') + '</div>';
    } else if (tab === 'budget') {
      h += '<div class="row"><h3>🧾 Vergi Oranı: <span id="tx-v">%' + S.tax + '</span></h3><input type="range" min="0" max="20" step="1" value="' + S.tax + '" id="tx-r"><p id="tx-e"></p></div>' +
        '<div class="row" id="bg-rows"></div><div class="note">Yüksek vergi geliri artırır ama halkı mutsuz eder; mutsuz halk şehri terk eder.</div>';
    } else if (tab === 'store') {
      h += '<div class="note">Depo kapasitesi (her kaynak): <b>' + CB.fmt(tot.stor) + '</b> · Depo binaları ve Belediye seviyesi artırır.</div>';
      D.RES_ORDER.forEach(function (r) {
        if (D.RES[r].lvl > S.lvl && S.res[r] < 1) return;
        var rt = sim.R.rate.res[r];
        h += '<div class="row"><div class="line"><div class="f"><h3>' + D.RES[r].icon + ' ' + D.RES[r].name + '</h3></div><b>' + CB.fmt(S.res[r]) + '</b><span style="font-size:12px;width:64px;text-align:right;color:' + (rt < -0.05 ? '#c23a2a' : '#23894e') + '">' + CB.fmtRate(rt) + '/dk</span></div>' +
          '<div class="pbar' + (S.res[r] >= tot.stor - 0.5 ? ' gold' : ' green') + '"><i style="width:' + Math.min(100, S.res[r] / tot.stor * 100) + '%"></i></div></div>';
      });
      h += '<div class="row">' + kv('🔬 Bilim puanı', CB.fmt(S.sci) + ' (' + CB.fmtRate(sim.R.rate.sci) + '/dk)') + '</div>';
    } else {
      h += '<canvas class="chart" id="ch-pop"></canvas><canvas class="chart" id="ch-money"></canvas><canvas class="chart" id="ch-happy"></canvas><div class="note">Son ' + S.hist.length + ' dakikanın kaydı.</div>';
    }
    return h;
  };
  function updateBudget() {
    var fl = sim.R.flow, tot = sim.R.tot, e = $('tx-e'), rows = $('bg-rows');
    if (!e) return;
    var te = S.tax <= 10 ? (10 - S.tax) : -(S.tax - 10) * 2.5;
    $('tx-v').textContent = '%' + S.tax;
    e.innerHTML = 'Mutluluğa etkisi: <b style="color:' + (te < 0 ? '#c23a2a' : '#23894e') + '">' + (te >= 0 ? '+' : '') + num(te) + '</b>';
    rows.innerHTML = kv('🏠 Vergi geliri', '+₺' + CB.fmt(fl.tax) + '/dk', 'pos') + kv('🏪 Ticaret geliri', '+₺' + CB.fmt(fl.com) + '/dk', 'pos') + kv('🧾 Bina bakımı', '-₺' + CB.fmt(fl.up) + '/dk', 'neg') +
      kv('Net', (fl.tax + fl.com - fl.up >= 0 ? '+' : '-') + '₺' + CB.fmt(Math.abs(fl.tax + fl.com - fl.up)) + '/dk', fl.tax + fl.com - fl.up >= 0 ? 'pos' : 'neg') + kv('😊 Mutluluk', '%' + Math.round(tot.happy));
  }
  function drawCharts() {
    [['ch-pop', 0, '#2f86d6', 'Nüfus'], ['ch-money', 1, '#2fb86a', 'Kasa (₺)'], ['ch-happy', 2, '#f5b83d', 'Mutluluk (%)']].forEach(function (c) {
      var cv = $(c[0]); if (!cv) return;
      var w = cv.clientWidth, h = cv.clientHeight, d = window.devicePixelRatio || 1; cv.width = w * d; cv.height = h * d;
      var x = cv.getContext('2d'); x.scale(d, d);
      var data = S.hist.map(function (r) { return r[c[1]]; });
      var mx = Math.max.apply(null, data.concat([1])), mn = Math.min.apply(null, data.concat([0]));
      if (c[1] === 2) { mx = 100; mn = 0; }
      x.fillStyle = '#26303b'; x.font = 'bold 12px sans-serif'; x.fillText(c[3], 10, 18);
      x.font = '10px sans-serif'; x.fillStyle = '#8a8273'; x.textAlign = 'right'; x.fillText(CB.fmt(mx), w - 8, 16); x.fillText(CB.fmt(mn), w - 8, h - 6); x.textAlign = 'left';
      if (data.length < 2) { x.fillText('Veri toplanıyor…', 10, h / 2); return; }
      x.beginPath();
      data.forEach(function (v, i) { var px = 8 + i / (data.length - 1) * (w - 16), py = h - 10 - (v - mn) / (mx - mn || 1) * (h - 38); if (i) x.lineTo(px, py); else x.moveTo(px, py); });
      x.strokeStyle = c[2]; x.lineWidth = 2.5; x.lineJoin = 'round'; x.stroke();
      x.lineTo(w - 8, h - 10); x.lineTo(8, h - 10); x.closePath(); x.globalAlpha = 0.15; x.fillStyle = c[2]; x.fill(); x.globalAlpha = 1;
    });
  }
  VIEW.menu = function () {
    var h = '';
    if (tab === 'set') {
      [['sound', '🔊 Ses efektleri'], ['night', '🌙 Gece / gündüz döngüsü'], ['haptic', '📳 Titreşim']].forEach(function (s) {
        h += '<div class="tog"><span>' + s[1] + '</span><button class="sw' + (S.set[s[0]] ? ' on' : '') + '" data-act="toggle" data-arg="' + s[0] + '"></button></div>';
      });
      h += '<div class="note">Kent Ustası v1.0 · Oyun her 20 saniyede ve uygulamadan çıkarken otomatik kaydedilir. Oyun kapalıyken şehrin çalışmaya devam eder (en fazla ' + (8 + (S.techs.gece ? 4 : 0)) + ' saat).</div>';
    } else if (tab === 'help') {
      h += '<div class="row"><h3>🎮 Kontroller</h3><p>• Tek parmakla sürükle: haritayı kaydır<br>• İki parmakla: yakınlaştır / uzaklaştır<br>• Binaya dokun: bilgi, yükselt, taşı, yık<br>• Yol / yıkım aracında tek parmakla çiz, iki parmakla kaydır</p></div>' +
        '<div class="row"><h3>🏠 Temel kurallar</h3><p>• Binalar <b>Belediyeye bağlı bir yola</b> bitişik olmalı (kırmızı yanıp sönen yol bağlı değildir).<br>• Konutlar <b>elektrik ve su</b> ister; halk iş, gıda ve hizmet bekler.<br>• Mutluluk yükseldikçe evler dolar, vergi artar.<br>• Sanayi kirletir: fabrikaları ve santralleri evlerden uzak tut.</p></div>' +
        '<div class="row"><h3>📈 Büyüme</h3><p>• Görevleri izle: seni adım adım yönlendirir.<br>• XP kazandıkça seviye atlar, yeni binalar açarsın.<br>• <b>Belediyeyi yükselt</b>: yeni çağ, daha fazla inşaat ekibi ve bölge.<br>• 🧭 ile yeni bölge satın al; 🔬 ile kalıcı bonuslar araştır.<br>• 🚢 Ticaret: sözleşmeler ve pazar ile kaynakları paraya çevir.<br>• 👁️ ile mutluluk, kirlilik ve hizmet haritalarını gör.</p></div>' +
        '<div class="row"><h3>🗼 Uzun vadeli hedefler</h3><p>7 anıt, 26 teknoloji, 10 belediye çağı, 64 bölge ve nihai hedef: <b>Uzay Üssü</b>!</p></div>';
    } else {
      h += '<div class="btns"><button class="btn green" data-act="saveNow">💾 Şimdi Kaydet</button></div>' +
        '<div class="row" style="margin-top:8px"><h3>📤 Yedekle / Aktar</h3><p>Kaydını metin olarak kopyalayıp başka cihaza taşıyabilirsin.</p><textarea id="sv-txt" placeholder="Kayıt kodu burada görünecek / buraya yapıştır"></textarea>' +
        '<div class="btns"><button class="btn blue sm" data-act="exportSave">Kodu Oluştur</button><button class="btn gold sm" data-act="importSave">Koddan Yükle</button></div></div>' +
        '<div class="row"><h3>⚠️ Yeni Oyun</h3><p>Mevcut şehrin tamamen silinir.</p><div class="btns"><button class="btn red sm" data-act="newGame">Şehri Sil ve Yeniden Başla</button></div></div>';
    }
    return h;
  };

  /* ================= POPUP ================= */
  ui.popup = function (html, buttons, cb) { popQ.push({ html: html, buttons: buttons || [['Tamam', 'green']], cb: cb }); nextPopup(); };
  function nextPopup() {
    if (popOpen || !popQ.length) return;
    var p = popQ.shift(); popOpen = true; popCb = p.cb;
    el.pBox.innerHTML = p.html + '<div class="btns">' + p.buttons.map(function (b, i) { return '<button class="btn ' + b[1] + '" data-act="pop" data-arg="' + i + '">' + b[0] + '</button>'; }).join('') + '</div>';
    el.popup.classList.remove('hidden');
  }
  function closePopup(i) {
    el.popup.classList.add('hidden'); popOpen = false;
    var cb = popCb; popCb = null; if (cb) cb(i);
    nextPopup();
  }
  ui.confirm = function (title, text, yes, cb, cls) {
    ui.popup('<h2>' + title + '</h2><p>' + text + '</p>', [['Vazgeç', 'ghost'], [yes, cls || 'green']], function (i) { if (i === 1) cb(); });
  };

  ui.intro = function () {
    ui.popup('<div class="big">🏙️</div><h2>Hoş geldin, Başkan!</h2><p>Küçük bir köyden dev bir metropol kurmaya hazır mısın?</p>' +
      '<ul><li><b>Sürükle</b>: haritayı gez · <b>İki parmak</b>: yakınlaş</li><li><b>🏗️ İnşa</b> ile yol, ev, türbin ve su kulesi kur</li><li>Sol üstteki <b>görev</b> kutusu sana ne yapacağını söyler</li><li>Oyun kapalıyken de şehrin çalışır!</li></ul>', [['Başlayalım!', 'green']]);
  };
  ui.offline = function (o) {
    if (!o) return;
    var res = '';
    D.RES_ORDER.forEach(function (r) { if (Math.abs(o.res[r]) >= 1) res += '<span>' + D.RES[r].icon + ' ' + (o.res[r] > 0 ? '+' : '') + CB.fmt(o.res[r]) + '</span> '; });
    ui.popup('<div class="big">🌙</div><h2>Tekrar hoş geldin!</h2><p>Sen yokken şehrin <b>' + CB.fmtTime(o.sec) + '</b> boyunca çalıştı' + (o.capped ? ' (üst sınır)' : '') + '. Verim: %' + Math.round(o.eff * 100) + '</p>' +
      '<div class="gain">+₺' + CB.fmt(Math.max(0, o.money)) + '</div>' + (res ? '<p class="rew" style="justify-content:center">' + res + '</p>' : '') +
      (o.sci >= 1 ? '<p>🔬 +' + CB.fmt(o.sci) + ' bilim</p>' : '') + (o.done ? '<p>🏗️ ' + o.done + ' inşaat tamamlandı</p>' : ''), [['Harika!', 'green']]);
  };

  /* ================= EYLEMLER ================= */
  var ACT = {
    build: function () { if (buildOpen() || I.mode === 'place' || I.mode === 'paint') closeBuild(); else openBuild(); },
    cat: function (a) { cat = a; renderCats(); renderCards(); el.cards.scrollLeft = 0; },
    pick: function (id) {
      var def = B[id], lock = sim.lockReason(def);
      if (lock) { ui.toast('🔒 ' + def.name + ' için gerekli: ' + lock, 'bad'); CB.emit('sfx', 'error'); return; }
      if (def.max && sim.totalOf(id) >= def.max) { ui.toast('En fazla ' + def.max + ' adet kurulabilir', 'bad'); return; }
      if (def.tool) I.setPaint(id); else I.setPlace(id);
      CB.emit('sfx', 'tap');
    },
    placeOk: function () { I.confirm(); },
    placeCancel: function () { I.cancel(); if (el.bBuild.classList.contains('on')) { el.buildbar.classList.remove('hidden'); renderCards(); } },
    placeDone: function () { ACT.placeCancel(); },
    panel: function (a) { openPanel(a); },
    close: function () { closeModal(); },
    tab: function (a) { tab = a; renderTabs(); renderPanel(true); if (panel === 'city' && tab === 'budget') bindTax(); },
    deselect: function () { closeInfo(); },
    speed: function () { S.speed = (S.speed + 1) % 4; ui.toast(['⏸ Duraklatıldı', '▶ Normal hız', '▶▶ 2x hız', '▶▶▶ 3x hız'][S.speed]); ui.hud(); },
    home: function () { var th = sim.R.th; if (th) R.centerOn(th.x + 1, th.y + 1); },
    expand: function () {
      if (I.mode === 'expand') { I.cancel(); return; }
      if (buildOpen()) closeBuild(); closeInfo(); I.setExpand(true);
      if (R.cam.z > 0.55) R.setZoom(0.55);
      ui.toast('🧭 Yeşil bölgeye dokun · Fiyat ₺' + CB.fmt(sim.regionCost()) + ' · Sahip olunan ' + sim.ownedCount() + '/' + D.TH[S.th].regions);
    },
    overlayMenu: function () {
      el.ovmenu.innerHTML = OVERLAYS.map(function (o) { return '<button data-act="overlay" data-arg="' + o[0] + '" class="' + ((R.overlay || '') === o[0] ? 'on' : '') + '">' + o[1] + '</button>'; }).join('');
      el.ovmenu.classList.toggle('hidden');
    },
    overlay: function (a) { R.overlay = (a && R.overlay !== a) ? a : null; el.ovmenu.classList.add('hidden'); if (R.overlay) ui.toast('Harita: ' + OVERLAYS.filter(function (o) { return o[0] === R.overlay; })[0][1]); ui.hud(); },
    upgrade: function () { var r = sim.upgrade(R.sel); res(r, 'place'); renderInfo(); },
    repair: function () { res(sim.repair(R.sel), 'done'); renderInfo(); },
    speedUp: function () { res(sim.speedUp(R.sel), 'coin'); renderInfo(); },
    moveB: function () { var b = R.sel; el.info.classList.add('hidden'); I.setPlace(b.id, b); },
    demolish: function () {
      var b = R.sel; if (!b) return;
      if (b.st === 1) { sim.demolish(b); closeInfo(); return; }
      ui.confirm('🗑️ ' + B[b.id].name + ' yıkılsın mı?', 'Geri ödeme: ₺' + CB.fmt(sim.refund(b)), 'Yık', function () { sim.demolish(b); closeInfo(); CB.emit('sfx', 'place'); }, 'red');
    },
    claimMission: function () { var r = sim.claimMission(); if (r.ok) { CB.emit('sfx', 'coin'); ui.toast('🎁 Görev ödülü alındı!', 'good'); renderPanel(true); ui.hud(); } },
    claimDaily: function (a) { var r = sim.claimDaily(+a); if (r.ok) { CB.emit('sfx', 'coin'); ui.toast('🎁 +₺' + CB.fmt(r.rew.money), 'good'); renderPanel(true); } },
    claimLogin: function () { var r = sim.claimLogin(); if (r.ok) { CB.emit('sfx', 'coin'); ui.toast('📅 Günlük ödül: +₺' + CB.fmt(r.rew.money), 'good'); renderPanel(true); } },
    research: function (id) { var r = sim.research(id); res(r, 'done'); if (r.ok) ui.toast('🔬 ' + D.TECH[id].name + ' araştırıldı!', 'good'); renderPanel(true); },
    deliver: function (a) { var r = sim.deliver(+a); res(r, 'coin'); if (r.ok) ui.toast('📜 Teslim edildi: +₺' + CB.fmt(r.money) + ' · +' + CB.fmt(r.xp) + ' XP', 'good'); renderPanel(true); },
    skipContract: function (a) { sim.skipContract(+a); renderPanel(true); },
    buy: function (a) { var p = a.split('|'), r = sim.marketBuy(p[0], +p[1]); res(r, 'tap'); if (r.ok) ui.toast('+' + r.n + ' ' + D.RES[p[0]].icon + '  -₺' + CB.fmt(r.money)); renderPanel(true); },
    sell: function (a) { var p = a.split('|'), r = sim.marketSell(p[0], +p[1]); res(r, 'coin'); if (r.ok) ui.toast('-' + r.n + ' ' + D.RES[p[0]].icon + '  +₺' + CB.fmt(r.money), 'good'); renderPanel(true); },
    toggle: function (a) { S.set[a] = !S.set[a]; renderPanel(true); },
    rename: function () { var n = window.prompt('Şehrinin adı:', S.name); if (n && n.trim()) { S.name = n.trim().slice(0, 24); renderPanel(true); } },
    saveNow: function () { ui.toast(CB.save.write() ? '💾 Kaydedildi' : 'Kaydedilemedi', CB.save.write() ? 'good' : 'bad'); },
    exportSave: function () { var t = $('sv-txt'); t.value = CB.save.exportText(); t.select(); try { document.execCommand('copy'); ui.toast('Kod panoya kopyalandı', 'good'); } catch (e) { /* yok say */ } },
    importSave: function () {
      var t = $('sv-txt').value;
      if (!t.trim()) { ui.toast('Önce kodu yapıştır', 'bad'); return; }
      ui.confirm('Koddan yüklensin mi?', 'Mevcut şehrinin yerine koddaki şehir yüklenecek.', 'Yükle', function () {
        try { var o = CB.save.importText(t); sim.load(o); R.reset(); closeModal(); CB.main.afterLoad(); ui.toast('Şehir yüklendi', 'good'); } catch (e) { ui.toast('Geçersiz kayıt kodu', 'bad'); }
      });
    },
    newGame: function () { ui.confirm('⚠️ Emin misin?', 'Şehrin tamamen silinecek ve sıfırdan başlayacaksın.', 'Sil ve Başla', function () { closeModal(); CB.main.newGame(); }, 'red'); },
    pop: function (a) { closePopup(+a); }
  };
  function res(r, sfx) { if (r.ok) { CB.emit('sfx', sfx); CB.emit('haptic', 12); } else if (r.reason) { ui.toast(r.reason, 'bad'); CB.emit('sfx', 'error'); } }
  function bindTax() {
    var r = $('tx-r'); if (!r) return;
    r.addEventListener('input', function () { sim.setTax(+r.value); sim.recalc(); updateBudget(); });
    updateBudget();
  }

  /* geri tuşu (Android) */
  CB.onBack = function () {
    if (popOpen) { return true; }
    if (panel) { closeModal(); return true; }
    if (!el.ovmenu.classList.contains('hidden')) { el.ovmenu.classList.add('hidden'); return true; }
    if (I.mode === 'place' || I.mode === 'paint') { ACT.placeCancel(); return true; }
    if (I.mode === 'expand') { I.cancel(); return true; }
    if (buildOpen()) { closeBuild(); return true; }
    if (R.sel) { closeInfo(); return true; }
    return false;
  };

  /* ================= KURULUM ================= */
  ui.init = function () {
    S = sim.S;
    el = { lvl: $('h-lvl'), xp: $('h-xp'), money: $('h-money'), mrate: $('h-mrate'), pop: $('h-pop'), happy: $('h-happy'), face: $('h-face'), top2: $('top2'), mission: $('mission'), effects: $('effects'),
      toasts: $('toasts'), info: $('info'), placebar: $('placebar'), buildbar: $('buildbar'), cats: $('cats'), cards: $('cards'), modal: $('modal'), mTitle: $('m-title'), mTabs: $('m-tabs'), mBody: $('m-body'),
      popup: $('popup'), pBox: $('p-box'), speed: $('b-speed'), bOverlay: $('b-overlay'), bExpand: $('b-expand'), ovmenu: $('ovmenu'), dMissions: $('d-missions'), dResearch: $('d-research'), dTrade: $('d-trade'),
      bBuild: document.querySelector('[data-act=build]') };
    document.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== document.body && !(t.dataset && t.dataset.act)) t = t.parentNode;
      if (!t || !t.dataset || !t.dataset.act) return;
      if (t.id === 'mission' && sim.S.missionDone) { ACT.claimMission(); CB.emit('userGesture', {}); return; }
      var fn = ACT[t.dataset.act];
      CB.emit('userGesture', {});
      if (fn) { S = sim.S; fn(t.dataset.arg); if (t.dataset.act === 'panel' && panel === 'city' && tab === 'budget') bindTax(); }
    });
    var hudEl = $('hud');
    [hudEl, el.modal].forEach(function (n) {
      n.addEventListener('pointerdown', function (e) { if (e.target.id !== 'hud') pressing = true; });
    });
    ['pointerup', 'pointercancel'].forEach(function (t) { window.addEventListener(t, function () { setTimeout(function () { pressing = false; }, 0); }); });
    el.modal.addEventListener('click', function (e) { if (e.target === el.modal) closeModal(); });

    CB.on('toast', function (e) { ui.toast(e.text, e.bad ? 'bad' : e.good ? 'good' : ''); });
    CB.on('mode', function () {
      renderPlacebar();
      if (I.mode === 'idle' && el.bBuild.classList.contains('on') && el.buildbar.classList.contains('hidden')) { el.buildbar.classList.remove('hidden'); renderCards(); }
      ui.hud();
    });
    CB.on('ghost', renderPlacebar);
    CB.on('select', function (b) { if (b) { R.sel = b; el.ovmenu.classList.add('hidden'); if (buildOpen()) closeBuild(); renderInfo(); } else closeInfo(); });
    CB.on('askDemolish', function (b) { R.sel = b; ACT.demolish(); });
    CB.on('askRegion', function (r) {
      var c = sim.regionCost();
      ui.confirm('🧭 Bölge satın al', 'Bu bölge <b>₺' + CB.fmt(c) + '</b> karşılığında şehrine katılacak.', 'Satın Al', function () {
        var rr = sim.buyRegion(r); res(rr, 'done'); if (rr.ok) ui.toast('🎉 Yeni bölge senin! (' + sim.ownedCount() + '/' + D.TH[S.th].regions + ')', 'good');
      });
    });
    CB.on('built', function (e) {
      var b = e.b, def = B[b.id];
      if (!e.instant) { CB.emit('sfx', 'done'); R.float(b.x + def.size / 2, b.y + def.size / 2, e.upgrade ? '⬆️ ' + def.name : '✔ ' + def.name, '#b9ffcf'); }
      if (e.upgrade && b.id === 'townhall') ui.popup('<div class="big">🏛️</div><h2>Yeni çağ: ' + D.TH[b.l].name + '</h2><p>Belediyen ' + b.l + '. seviyeye yükseldi!</p><ul><li>İnşaat ekibi: ' + D.TH[b.l].crews + '</li><li>Bölge sınırı: ' + D.TH[b.l].regions + '</li><li>Depo: ' + CB.fmt(D.TH[b.l].stor) + '</li><li>Vergi bonusu: +%' + Math.round(D.TH[b.l].tax * 100) + '</li></ul>');
      if (R.sel === b) renderInfo();
      if (buildOpen()) renderCards();
    });
    CB.on('levelup', function (e) { lvlQ.push(e); });
    CB.on('missionDone', function () { CB.emit('sfx', 'coin'); ui.toast('🎁 Görev tamamlandı! Ödülünü al.', 'good'); });
    CB.on('ach', function (e) { ui.toast('🏅 Başarım: ' + e.a.name + ' (+' + CB.fmt(e.a.xp) + ' XP)', 'good'); });
    CB.on('tech', function () { if (buildOpen()) renderCards(); });
    CB.on('fire', function (e) { CB.emit('sfx', 'fire'); ui.toast('🔥 Yangın: ' + B[e.b.id].name + '!', 'bad'); });
    CB.on('event', function (e) {
      var ev = e.ev;
      if (ev.choice === 'festival') {
        ui.popup('<div class="big">' + ev.icon + '</div><h2>' + ev.name + '</h2><p>' + ev.text + '</p><p>Maliyet: <b>₺' + CB.fmt(e.cost) + '</b></p>', [['Hayır', 'ghost'], ['Düzenle', 'green']], function (i) {
          if (i === 1) { var r = sim.acceptFestival(); res(r, 'level'); if (r.ok) ui.toast('🎉 Festival başladı!', 'good'); }
        });
      } else ui.toast(ev.icon + ' ' + ev.name + ': ' + ev.text + (e.detail ? ' ' + e.detail : ''), ev.bad ? 'bad' : 'good');
      if (!ev.bad) CB.emit('sfx', 'coin');
    });
    CB.on('win', function () {
      ui.popup('<div class="big">🚀</div><h2>Yıldızlara Doğru!</h2><p>Uzay Üssü tamamlandı. Küçük bir köyü insanlığın uzaya açılan kapısına dönüştürdün, Başkan!</p><p>Şehrini geliştirmeye dilediğin kadar devam edebilirsin.</p>', [['Devam Et', 'green']]);
    });
  };

  /* periyodik yenileme (saniyede ~2) */
  var pressing = false, lvlQ = [];
  /* art arda gelen seviye atlamalarını tek pencerede göster */
  function flushLevels() {
    if (!lvlQ.length) return;
    var last = lvlQ[lvlQ.length - 1], rew = 0, ids = [];
    lvlQ.forEach(function (e) { rew += e.reward; ids = ids.concat(e.unlocks); });
    lvlQ = [];
    CB.emit('sfx', 'level'); CB.emit('haptic', 40);
    var u = ids.slice(0, 12).map(function (id) { return '<div><img src="' + art.thumb(id) + '">' + B[id].name + '</div>'; }).join('');
    ui.popup('<div class="big">⭐</div><h2>Seviye ' + last.lvl + '!</h2><div class="gain">+₺' + CB.fmt(rew) + '</div>' + (u ? '<p>Yeni binalar açıldı:</p><div class="unl">' + u + '</div>' : '<p>Şehrin büyümeye devam ediyor!</p>'));
    if (buildOpen()) renderCards();
  }
  ui.refresh = function () {
    flushLevels();
    if (pressing) return;
    ui.hud();
    if (R.sel && !el.info.classList.contains('hidden')) renderInfo();
    if (panel && !popOpen) renderPanel(false);
    if (buildOpen() && !el.buildbar.classList.contains('hidden')) {
      var k = Math.floor(sim.S.money / 50) + '|' + sim.S.lvl + '|' + Math.floor(sim.S.res.wood / 5) + '|' + Math.floor(sim.S.res.stone / 5);
      if (el.cards._k !== k) { var sl = el.cards.scrollLeft; renderCards(); el.cards.scrollLeft = sl; el.cards._k = k; }
    }
    if (I.mode === 'place' && R.ghost && R.ghost.x !== null) I.validate();
  };
})();
