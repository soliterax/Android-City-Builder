'use strict';
/* Kent Ustası - kayıt: Android köprüsü (dosya) + localStorage yedeği */
(function () {
  var KEY = 'kentustasi_save_v1';
  var SV = CB.save = {};
  function bridge() { return (typeof window !== 'undefined' && window.AndroidBridge) || null; }

  SV.write = function () {
    if (!CB.sim.S) return false;
    var json = CB.sim.serialize(), ok = false;
    try { var b = bridge(); if (b && b.saveGame) { b.saveGame(json); ok = true; } } catch (e) { /* yok say */ }
    try { localStorage.setItem(KEY, json); ok = true; } catch (e) { /* yok say */ }
    return ok;
  };
  SV.read = function () {
    var a = null, c = null;
    try { var b = bridge(); if (b && b.loadGame) a = b.loadGame(); } catch (e) { a = null; }
    try { c = localStorage.getItem(KEY); } catch (e) { c = null; }
    var best = null, bestT = -1;
    [a, c].forEach(function (s) {
      if (!s) return;
      try { var o = JSON.parse(s); if (o && o.v === 1 && (o.saved || 0) > bestT) { best = o; bestT = o.saved || 0; } } catch (e) { /* bozuk kayıt */ }
    });
    return best;
  };
  SV.clear = function () {
    try { var b = bridge(); if (b && b.saveGame) b.saveGame(''); } catch (e) { /* yok say */ }
    try { localStorage.removeItem(KEY); } catch (e) { /* yok say */ }
  };
  SV.exportText = function () { return btoa(unescape(encodeURIComponent(CB.sim.serialize()))); };
  SV.importText = function (txt) { return JSON.parse(decodeURIComponent(escape(atob(txt.trim())))); };
})();
