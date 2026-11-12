'use strict';
/* Kent Ustası - açılış ve ana döngü */
(function () {
  var sim = CB.sim, R = CB.render, ui = CB.ui;
  var M = CB.main = {};
  var last = 0, acc = 0, uiT = 0, saveT = 0, badgeT = 0, time = 0, hiddenAt = 0, running = false;

  function frame(ts) {
    var dt = Math.min(0.1, (ts - last) / 1000 || 0); last = ts; time += dt;
    var S = sim.S;
    acc += dt * S.speed;
    var n = 0;
    while (acc >= 1 && n < 5) { sim.tick(1); acc -= 1; n++; }
    if (acc > 3) acc = 0;
    R.draw(time, dt);
    uiT += dt; if (uiT > 0.5) { uiT = 0; ui.refresh(); }
    badgeT += dt; if (badgeT > 1) { badgeT = 0; R.refreshBadges(); }
    saveT += dt; if (saveT > 20) { saveT = 0; CB.save.write(); }
    requestAnimationFrame(frame);
  }

  M.afterLoad = function () {
    var th = sim.R.th;
    if (th) R.centerOn(th.x + 1, th.y + 1.5);
    R.refreshBadges(); ui.hud();
  };
  M.newGame = function () {
    CB.save.clear();
    sim.newGame((Math.random() * 2147483647) | 0);
    R.reset(); M.afterLoad(); CB.save.write(); ui.intro();
  };

  function onHide() { hiddenAt = Date.now(); CB.save.write(); }
  function onShow() {
    if (!hiddenAt) return;
    var el = (Date.now() - hiddenAt) / 1000; hiddenAt = 0; last = performance.now();
    if (el > 60) { var off = sim.offline(el); sim.checkDaily(); if (off && off.sec >= 300) ui.offline(off); }
  }

  M.boot = function () {
    var cv = document.getElementById('cv');
    R.init(cv); CB.input.init(cv);
    var o = CB.save.read(), off = null, fresh = false;
    if (o) {
      try {
        sim.load(o);
        off = sim.offline((Date.now() - (o.saved || Date.now())) / 1000);
        sim.checkDaily();
        if (!sim.S.speed) sim.S.speed = 1;
      } catch (e) { if (window.console) console.error(e); o = null; }
    }
    if (!o) { sim.newGame((Math.random() * 2147483647) | 0); fresh = true; }
    ui.init(); M.afterLoad();
    window.addEventListener('resize', function () { R.resize(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) onHide(); else onShow(); });
    window.addEventListener('pagehide', function () { CB.save.write(); });
    var ld = document.getElementById('loading');
    ld.classList.add('out'); setTimeout(function () { ld.style.display = 'none'; }, 600);
    if (fresh) ui.intro();
    else if (off && off.sec >= 300) ui.offline(off);
    if (!fresh && !sim.S.daily.loginClaim) ui.toast('📅 Günlük giriş ödülün hazır! (Görev > Günlük)', 'good');
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  };

  /* Android tarafından çağrılır */
  CB.setInsets = function (t, r, b, l) {
    var st = document.documentElement.style;
    st.setProperty('--sat', t + 'px'); st.setProperty('--sar', r + 'px'); st.setProperty('--sab', b + 'px'); st.setProperty('--sal', l + 'px');
  };
  M.pause = function () { onHide(); };
  M.resume = function () { onShow(); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', M.boot); else M.boot();
})();
