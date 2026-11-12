'use strict';
/* Kent Ustası - sentezlenmiş ses efektleri (dosya gerektirmez) */
(function () {
  var A = CB.audio = {}, ac = null, last = {};
  function ctx() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f, t0, dur, type, vol, f2) {
    var a = ac, o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, a.currentTime + t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, a.currentTime + t0 + dur);
    g.gain.setValueAtTime(0.0001, a.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, a.currentTime + t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + dur + 0.03);
  }
  var S = {
    tap: function () { tone(520, 0, 0.06, 'triangle', 0.07); },
    place: function () { tone(180, 0, 0.12, 'square', 0.06, 90); tone(420, 0.05, 0.1, 'triangle', 0.08); },
    done: function () { tone(523, 0, 0.1, 'triangle', 0.1); tone(659, 0.09, 0.1, 'triangle', 0.1); tone(784, 0.18, 0.18, 'triangle', 0.1); },
    coin: function () { tone(988, 0, 0.07, 'square', 0.05); tone(1319, 0.07, 0.16, 'square', 0.05); },
    error: function () { tone(160, 0, 0.16, 'sawtooth', 0.07, 110); },
    level: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, i * 0.09, 0.22, 'triangle', 0.1); }); },
    fire: function () { tone(880, 0, 0.18, 'square', 0.06); tone(660, 0.2, 0.18, 'square', 0.06); tone(880, 0.4, 0.18, 'square', 0.06); },
    open: function () { tone(360, 0, 0.07, 'sine', 0.06, 520); }
  };
  A.play = function (name) {
    if (!CB.sim.S || !CB.sim.S.set.sound) return;
    var now = Date.now(); if (last[name] && now - last[name] < 60) return; last[name] = now;
    if (!ctx() || !S[name]) return;
    try { S[name](); } catch (e) { /* ses yok */ }
  };
  A.unlock = function () { ctx(); };
  CB.on('sfx', A.play);
  CB.on('userGesture', A.unlock);
  CB.on('haptic', function (ms) {
    if (!CB.sim.S || !CB.sim.S.set.haptic) return;
    try {
      if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(ms);
      else if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) { /* yok say */ }
  });
})();
