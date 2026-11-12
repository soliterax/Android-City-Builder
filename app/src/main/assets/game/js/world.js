'use strict';
/* Kent Ustası - harita üretimi ve ızgara yardımcıları */
(function () {
  var D = CB.D, N = D.MAP;
  var W = CB.world = {};
  var T = W.T = { GRASS: 0, FOREST: 1, WATER: 2, SAND: 3, ROCK: 4, ORE: 5 };

  W.idx = function (x, y) { return x + y * N; };
  W.inB = function (x, y) { return x >= 0 && y >= 0 && x < N && y < N; };
  W.regOf = function (x, y) { return (x >> 3) + (y >> 3) * (N / D.REG); };

  function count(t, type, x0, y0, x1, y1) {
    var c = 0;
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) if (t[x + y * N] === type) c++;
    return c;
  }
  function blob(t, cx, cy, n, type, rnd, over) {
    var x = cx, y = cy;
    for (var i = 0; i < n * 3 && n > 0; i++) {
      if (W.inB(x, y) && (over.indexOf(t[x + y * N]) >= 0)) { t[x + y * N] = type; n--; }
      var r = rnd();
      if (r < 0.25) x++; else if (r < 0.5) x--; else if (r < 0.75) y++; else y--;
      x = CB.clamp(x, cx - 2, cx + 2); y = CB.clamp(y, cy - 2, cy + 2);
    }
  }

  W.generate = function (seed) {
    var t = new Uint8Array(N * N), c = N / 2, x, y;
    var rnd = CB.mulberry(seed ^ 0x5bd1e995);
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      var dx = x - c + 0.5, dy = y - c + 0.5, dist = Math.sqrt(dx * dx + dy * dy);
      var h = CB.fbm(x / 14, y / 14, seed, 4);
      var edge = Math.min(x, y, N - 1 - x, N - 1 - y);
      if (dist < 11) h += (11 - dist) * 0.03;
      if (edge < 5) h -= (5 - edge) * 0.05;
      var rv = Math.abs(CB.fbm(x / 20 + 5, y / 20 + 9, seed + 99, 2) - 0.5);
      var type;
      if (h < 0.37 || (rv < 0.018 && dist > 9)) type = T.WATER;
      else {
        var f = CB.fbm(x / 6, y / 6, seed + 31, 3);
        var r = CB.fbm(x / 5, y / 5, seed + 57, 2);
        var o = CB.fbm(x / 5, y / 5, seed + 83, 2);
        if (r > 0.71 && dist > 6) type = T.ROCK;
        else if (o > 0.73 && dist > 12) type = T.ORE;
        else if (f > 0.57 && dist > 4.5) type = T.FOREST;
        else type = T.GRASS;
      }
      t[x + y * N] = type;
    }
    // merkez: belediye çevresi temiz çimen
    for (y = 28; y <= 35; y++) for (x = 28; x <= 35; x++) t[x + y * N] = T.GRASS;
    // garanti kaynaklar
    var land = [T.GRASS, T.FOREST, T.SAND];
    if (count(t, T.FOREST, 24, 24, 39, 39) < 10) { blob(t, 26, 26, 9, T.FOREST, rnd, land); blob(t, 37, 37, 6, T.FOREST, rnd, land); }
    if (count(t, T.ROCK, 22, 22, 41, 41) < 4) blob(t, 38, 26, 5, T.ROCK, rnd, land);
    if (count(t, T.WATER, 14, 14, 49, 49) < 14) {
      for (y = 40; y <= 46; y++) for (x = 16; x <= 23; x++) {
        var ddx = (x - 19.5) / 4, ddy = (y - 43) / 3.2;
        if (ddx * ddx + ddy * ddy < 1) t[x + y * N] = T.WATER;
      }
    }
    if (count(t, T.ORE, 8, 8, 55, 55) < 8) { blob(t, 45, 20, 6, T.ORE, rnd, land); blob(t, 18, 30, 5, T.ORE, rnd, land); }
    // kumsal
    var copy = new Uint8Array(t);
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      var v = copy[x + y * N];
      if (v !== T.GRASS && v !== T.FOREST) continue;
      var near = false;
      for (var j = -1; j <= 1 && !near; j++) for (var i = -1; i <= 1; i++) {
        if (W.inB(x + i, y + j) && copy[x + i + (y + j) * N] === T.WATER) { near = true; break; }
      }
      if (near && CB.hash2(x, y, seed + 7) < 0.85) t[x + y * N] = T.SAND;
    }
    return t;
  };
})();
