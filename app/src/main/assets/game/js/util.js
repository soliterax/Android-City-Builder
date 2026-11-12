'use strict';
/* Kent Ustası - yardımcı fonksiyonlar */
var CB = (typeof window !== 'undefined' ? window : globalThis).CB = {};
(function () {
  CB.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  CB.lerp = function (a, b, t) { return a + (b - a) * t; };

  CB.mulberry = function (seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  CB.hash2 = function (x, y, s) {
    var h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  function smooth(t) { return t * t * (3 - 2 * t); }
  CB.noise2 = function (x, y, s) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var a = CB.hash2(xi, yi, s), b = CB.hash2(xi + 1, yi, s), c = CB.hash2(xi, yi + 1, s), d = CB.hash2(xi + 1, yi + 1, s);
    var u = smooth(xf), v = smooth(yf);
    return CB.lerp(CB.lerp(a, b, u), CB.lerp(c, d, u), v);
  };
  CB.fbm = function (x, y, s, oct) {
    var v = 0, amp = 0.5, f = 1, tot = 0;
    for (var i = 0; i < (oct || 3); i++) { v += CB.noise2(x * f, y * f, s + i * 17) * amp; tot += amp; amp *= 0.5; f *= 2; }
    return v / tot;
  };

  function dots(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  /* Türkçe kısa sayı: 12.500 / 125B / 3,4Mn / 1,2Mr */
  CB.fmt = function (n) {
    var neg = n < 0; n = Math.abs(n);
    var s;
    if (n < 100000) s = dots(Math.floor(n));
    else if (n < 1e6) s = Math.floor(n / 1e3) + 'B';
    else if (n < 1e9) s = (Math.floor(n / 1e5) / 10).toString().replace('.', ',') + 'Mn';
    else s = (Math.floor(n / 1e8) / 10).toString().replace('.', ',') + 'Mr';
    return (neg ? '-' : '') + s;
  };
  CB.fmtRate = function (n) {
    var a = Math.abs(n), s;
    if (a < 10) s = (Math.round(a * 10) / 10).toString().replace('.', ',');
    else s = CB.fmt(Math.round(a));
    return (n < -0.04 ? '-' : '+') + s;
  };
  CB.fmtTime = function (sec) {
    sec = Math.max(0, Math.ceil(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0) return h + 'sa ' + (m > 0 ? m + 'dk' : '');
    if (m > 0) return m + 'dk ' + (s > 0 && m < 10 ? s + 'sn' : '');
    return s + 'sn';
  };

  /* basit olay sistemi */
  var handlers = {};
  CB.on = function (type, fn) { (handlers[type] = handlers[type] || []).push(fn); };
  CB.emit = function (type, data) {
    var l = handlers[type]; if (!l) return;
    for (var i = 0; i < l.length; i++) l[i](data);
  };

  CB.today = function () {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  };
  CB.dayDiff = function (a, b) {
    if (!a || !b) return 999;
    var pa = a.split('-'), pb = b.split('-');
    var da = Date.UTC(+pa[0], +pa[1] - 1, +pa[2]), db = Date.UTC(+pb[0], +pb[1] - 1, +pb[2]);
    return Math.round((db - da) / 86400000);
  };
})();
