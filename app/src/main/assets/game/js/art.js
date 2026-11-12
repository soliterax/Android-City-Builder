'use strict';
/* Kent Ustası - izometrik çizim kiti ve prosedürel sprite üretimi */
(function () {
  var TW = 64, TH = 32, ZH = 36, HW = TW / 2, HH = TH / 2;
  CB.TW = TW; CB.TH = TH; CB.ZH = ZH;
  var art = CB.art = {};

  function rgb(c) {
    if (c.charAt(0) === '#') {
      if (c.length === 4) return [parseInt(c[1] + c[1], 16), parseInt(c[2] + c[2], 16), parseInt(c[3] + c[3], 16)];
      return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)];
    }
    var m = c.match(/\d+/g); return [+m[0], +m[1], +m[2]];
  }
  function shade(c, f) {
    var a = rgb(c), r, g, b;
    if (f <= 1) { r = a[0] * f; g = a[1] * f; b = a[2] * f; }
    else { var t = f - 1; r = a[0] + (255 - a[0]) * t; g = a[1] + (255 - a[1]) * t; b = a[2] + (255 - a[2]) * t; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  art.shade = shade;

  /* ===================== KİT ===================== */
  function Kit(ctx, s, ox, oy, lights, seed) {
    this.c = ctx; this.s = s; this.ox = ox; this.oy = oy; this.L = !!lights; this.rnd = CB.mulberry(seed || 7);
  }
  var K = Kit.prototype;
  K.p = function (u, v, z) { return [this.ox + (u - v) * HW * this.s, this.oy + (u + v) * HH * this.s - (z || 0) * ZH * this.s]; };
  K.poly = function (pts, fill, stroke) {
    var c = this.c; c.beginPath();
    for (var i = 0; i < pts.length; i++) { var q = this.p(pts[i][0], pts[i][1], pts[i][2]); if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = Math.max(1, this.s * 0.5); c.stroke(); }
  };
  K.g = function (u, v, w, d, col, z) { if (this.L) return; z = z || 0; this.poly([[u, v, z], [u + w, v, z], [u + w, v + d, z], [u, v + d, z]], col, col); };
  K.box = function (u, v, w, d, z, h, col, o) {
    if (this.L) return; o = o || {};
    var z1 = z + h;
    var lc = o.left || col, rc = o.right || shade(col, 0.78), tc = o.top || shade(col, 1.16);
    this.poly([[u, v + d, z], [u + w, v + d, z], [u + w, v + d, z1], [u, v + d, z1]], lc, lc);
    this.poly([[u + w, v, z], [u + w, v + d, z], [u + w, v + d, z1], [u + w, v, z1]], rc, rc);
    this.poly([[u, v, z1], [u + w, v, z1], [u + w, v + d, z1], [u, v + d, z1]], tc, tc);
  };
  K.rl = function (u0, u1, vf, z0, z1, col) { if (this.L) return; this.poly([[u0, vf, z0], [u1, vf, z0], [u1, vf, z1], [u0, vf, z1]], col); };
  K.rr = function (v0, v1, uf, z0, z1, col) { if (this.L) return; this.poly([[uf, v0, z0], [uf, v1, z0], [uf, v1, z1], [uf, v0, z1]], col); };
  function wins(k, side, a, b, f, z0, z1, cols, rows, o) {
    o = o || {};
    var px = o.px === undefined ? 0.22 : o.px, pb = o.pb === undefined ? 0.3 : o.pb, pt = o.pt === undefined ? 0.2 : o.pt;
    var cw = (b - a) / cols, ch = (z1 - z0) / rows;
    var col = o.col || '#a9d6ee'; if (side) col = shade(col, 0.82);
    var lit = o.lit === undefined ? 0.5 : o.lit;
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
      var x0 = a + i * cw + cw * px, x1 = a + (i + 1) * cw - cw * px, y0 = z0 + j * ch + ch * pb, y1 = z0 + (j + 1) * ch - ch * pt;
      var fill = col;
      if (k.L) { var r = k.rnd(); if (r > lit) continue; fill = r < lit * 0.15 ? '#bfe6ff' : (r < lit * 0.6 ? '#ffe08a' : '#ffc95e'); }
      if (side) k.poly([[f, x0, y0], [f, x1, y0], [f, x1, y1], [f, x0, y1]], fill);
      else k.poly([[x0, f, y0], [x1, f, y0], [x1, f, y1], [x0, f, y1]], fill);
    }
  }
  K.wl = function (u0, u1, vf, z0, z1, cols, rows, o) { wins(this, 0, u0, u1, vf, z0, z1, cols, rows, o); };
  K.wr = function (v0, v1, uf, z0, z1, cols, rows, o) { wins(this, 1, v0, v1, uf, z0, z1, cols, rows, o); };
  /* kutunun iki görünür yüzüne pencere */
  K.win = function (u, v, w, d, z0, z1, cols, rows, o) {
    o = o || {}; var m = o.m === undefined ? 0.06 : o.m;
    this.wl(u + m * w, u + w - m * w, v + d, z0, z1, cols, rows, o);
    this.wr(v + m * d, v + d - m * d, u + w, z0, z1, o.cols2 || cols, rows, o);
  };
  K.gb = function (u, v, w, d, z, h, col, axis, wall) {
    if (this.L) return;
    wall = wall || col;
    if (axis === 'v') { // sırt v boyunca
      var mu = u + w / 2;
      this.poly([[u, v + d, z], [u + w, v + d, z], [mu, v + d, z + h]], wall, wall);
      this.poly([[u + w, v, z], [u + w, v + d, z], [mu, v + d, z + h], [mu, v, z + h]], shade(col, 0.8), shade(col, 0.8));
      this.poly([[u, v, z], [u, v + d, z], [mu, v + d, z + h], [mu, v, z + h]], shade(col, 1.1));
    } else {
      var mv = v + d / 2;
      this.poly([[u + w, v, z], [u + w, v + d, z], [u + w, mv, z + h]], shade(wall, 0.8), shade(wall, 0.8));
      this.poly([[u, v + d, z], [u + w, v + d, z], [u + w, mv, z + h], [u, mv, z + h]], col, col);
    }
  };
  K.hip = function (u, v, w, d, z, h, col) {
    if (this.L) return;
    var a = [u + w / 2, v + d / 2, z + h];
    this.poly([[u, v, z], [u, v + d, z], a], shade(col, 1.12));
    this.poly([[u, v + d, z], [u + w, v + d, z], a], col, col);
    this.poly([[u + w, v, z], [u + w, v + d, z], a], shade(col, 0.78), shade(col, 0.78));
  };
  K.cyl = function (cu, cv, r, z, h, col, top) {
    if (this.L) return;
    var c = this.c, a = this.p(cu, cv, z), b = this.p(cu, cv, z + h), rx = r * TW * 0.7071 * this.s, ry = r * TH * 0.7071 * this.s;
    var gr = c.createLinearGradient(a[0] - rx, 0, a[0] + rx, 0);
    gr.addColorStop(0, shade(col, 1.12)); gr.addColorStop(0.45, col); gr.addColorStop(1, shade(col, 0.68));
    c.beginPath(); c.moveTo(b[0] - rx, b[1]); c.lineTo(a[0] - rx, a[1]);
    c.ellipse(a[0], a[1], rx, ry, 0, Math.PI, 0, true);
    c.lineTo(b[0] + rx, b[1]); c.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI, true); c.closePath();
    c.fillStyle = gr; c.fill();
    c.beginPath(); c.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI * 2); c.fillStyle = top || shade(col, 1.2); c.fill();
  };
  /* daralan silindir (soğutma kulesi, fener) */
  K.taper = function (cu, cv, r0, r1, z, h, col, top) {
    if (this.L) return;
    var c = this.c, a = this.p(cu, cv, z), b = this.p(cu, cv, z + h), k = TW * 0.7071 * this.s, k2 = TH * 0.7071 * this.s;
    var gr = c.createLinearGradient(a[0] - r0 * k, 0, a[0] + r0 * k, 0);
    gr.addColorStop(0, shade(col, 1.12)); gr.addColorStop(0.45, col); gr.addColorStop(1, shade(col, 0.68));
    c.beginPath(); c.moveTo(b[0] - r1 * k, b[1]); c.lineTo(a[0] - r0 * k, a[1]);
    c.ellipse(a[0], a[1], r0 * k, r0 * k2, 0, Math.PI, 0, true);
    c.lineTo(b[0] + r1 * k, b[1]); c.ellipse(b[0], b[1], r1 * k, r1 * k2, 0, 0, Math.PI, true); c.closePath();
    c.fillStyle = gr; c.fill();
    c.beginPath(); c.ellipse(b[0], b[1], r1 * k, r1 * k2, 0, 0, Math.PI * 2); c.fillStyle = top || shade(col, 1.2); c.fill();
  };
  K.cone = function (cu, cv, r, z, h, col) {
    if (this.L) return;
    var c = this.c, a = this.p(cu, cv, z), b = this.p(cu, cv, z + h), rx = r * TW * 0.7071 * this.s, ry = r * TH * 0.7071 * this.s;
    var gr = c.createLinearGradient(a[0] - rx, 0, a[0] + rx, 0);
    gr.addColorStop(0, shade(col, 1.15)); gr.addColorStop(0.5, col); gr.addColorStop(1, shade(col, 0.68));
    c.beginPath(); c.moveTo(a[0] - rx, a[1]); c.ellipse(a[0], a[1], rx, ry, 0, Math.PI, 0, true); c.lineTo(b[0], b[1]); c.closePath();
    c.fillStyle = gr; c.fill();
  };
  K.dome = function (cu, cv, r, z, col, hk) {
    if (this.L) return;
    var c = this.c, a = this.p(cu, cv, z), rx = r * TW * 0.7071 * this.s, ry = r * TH * 0.7071 * this.s, hh = rx * (hk || 0.9);
    var gr = c.createRadialGradient(a[0] - rx * 0.35, a[1] - hh * 0.6, rx * 0.1, a[0], a[1] - hh * 0.2, rx * 1.2);
    gr.addColorStop(0, shade(col, 1.35)); gr.addColorStop(0.5, col); gr.addColorStop(1, shade(col, 0.65));
    c.beginPath(); c.moveTo(a[0] - rx, a[1]); c.ellipse(a[0], a[1], rx, ry, 0, Math.PI, 0, true);
    c.ellipse(a[0], a[1], rx, hh, 0, 0, Math.PI, true); c.closePath();
    c.fillStyle = gr; c.fill();
  };
  K.ball = function (cu, cv, z, r, col) {
    if (this.L) return;
    var c = this.c, a = this.p(cu, cv, z), rr = r * TW * 0.7 * this.s;
    var gr = c.createRadialGradient(a[0] - rr * 0.35, a[1] - rr * 0.4, rr * 0.1, a[0], a[1], rr);
    gr.addColorStop(0, shade(col, 1.3)); gr.addColorStop(0.6, col); gr.addColorStop(1, shade(col, 0.7));
    c.beginPath(); c.arc(a[0], a[1], rr, 0, Math.PI * 2); c.fillStyle = gr; c.fill();
  };
  K.disc = function (cu, cv, r, z, col, stroke) {
    if (this.L) return;
    var c = this.c, a = this.p(cu, cv, z);
    c.beginPath(); c.ellipse(a[0], a[1], r * TW * 0.7071 * this.s, r * TH * 0.7071 * this.s, 0, 0, Math.PI * 2);
    c.fillStyle = col; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = this.s * 1.5; c.stroke(); }
  };
  K.ln = function (a, b, col, w) {
    if (this.L) return;
    var c = this.c, p = this.p(a[0], a[1], a[2]), q = this.p(b[0], b[1], b[2]);
    c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.strokeStyle = col; c.lineWidth = (w || 1) * this.s; c.lineCap = 'round'; c.stroke();
  };
  K.lamp = function (u, v, z, r, col) {
    var c = this.c, a = this.p(u, v, z), rr = r * TW * this.s;
    if (!this.L) { c.beginPath(); c.arc(a[0], a[1], Math.min(2.6 * this.s, Math.max(1.2, rr * 0.22)), 0, Math.PI * 2); c.fillStyle = col || '#ffe9a8'; c.fill(); return; }
    var gr = c.createRadialGradient(a[0], a[1], 0, a[0], a[1], rr);
    var cc = rgb(col || '#ffe9a8');
    gr.addColorStop(0, 'rgba(' + cc[0] + ',' + cc[1] + ',' + cc[2] + ',0.95)'); gr.addColorStop(0.3, 'rgba(' + cc[0] + ',' + cc[1] + ',' + cc[2] + ',0.4)'); gr.addColorStop(1, 'rgba(' + cc[0] + ',' + cc[1] + ',' + cc[2] + ',0)');
    c.fillStyle = gr; c.beginPath(); c.arc(a[0], a[1], rr, 0, Math.PI * 2); c.fill();
  };
  K.flag = function (u, v, z, h, col) {
    if (this.L) return;
    this.ln([u, v, z], [u, v, z + h], '#eee', 1);
    var a = this.p(u, v, z + h), c = this.c, s = this.s;
    c.fillStyle = col; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a[0] + 9 * s, a[1] + 2.5 * s); c.lineTo(a[0], a[1] + 6 * s); c.closePath(); c.fill();
  };
  K.tree = function (cu, cv, sc, kind) {
    if (this.L) return;
    sc = sc || 1;
    var g = ['#3f9142', '#4aa24a', '#2f8040', '#5aae4f'][(this.rnd() * 4) | 0];
    this.disc(cu + 0.03, cv + 0.03, 0.16 * sc, 0, 'rgba(0,0,0,0.18)');
    this.ln([cu, cv, 0], [cu, cv, 0.3 * sc], '#6b4a2b', 2.2 * sc);
    if (kind === 1) {
      var pg = ['#2e6e45', '#2b7a4b', '#256340'][(this.rnd() * 3) | 0];
      this.cone(cu, cv, 0.2 * sc, 0.16 * sc, 0.42 * sc, pg);
      this.cone(cu, cv, 0.16 * sc, 0.38 * sc, 0.36 * sc, shade(pg, 1.08));
      this.cone(cu, cv, 0.11 * sc, 0.58 * sc, 0.3 * sc, shade(pg, 1.16));
    } else {
      this.ball(cu - 0.04 * sc, cv + 0.03 * sc, 0.36 * sc, 0.15 * sc, shade(g, 0.9));
      this.ball(cu + 0.05 * sc, cv - 0.02 * sc, 0.4 * sc, 0.15 * sc, g);
      this.ball(cu, cv, 0.54 * sc, 0.14 * sc, shade(g, 1.1));
    }
  };
  K.clock = function (u, vf, z, r) { // sol yüzde saat
    if (this.L) return;
    var c = this.c; c.beginPath();
    for (var i = 0; i <= 20; i++) { var t = i / 20 * Math.PI * 2, q = this.p(u + Math.cos(t) * r, vf, z + Math.sin(t) * r * 0.9); if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }
    c.closePath(); c.fillStyle = '#fffdf2'; c.fill(); c.strokeStyle = '#3a3a3a'; c.lineWidth = this.s; c.stroke();
    this.ln([u, vf, z], [u, vf, z + r * 0.6], '#222', 0.8); this.ln([u, vf, z], [u + r * 0.5, vf, z], '#222', 0.8);
  };
  K.cross = function (u, vf, z, sz, col) { // sol yüzde artı
    this.rl(u - sz * 0.5, u + sz * 0.5, vf, z - sz * 0.17, z + sz * 0.17, col);
    this.rl(u - sz * 0.17, u + sz * 0.17, vf, z - sz * 0.5, z + sz * 0.5, col);
  };
  K.cols = function (u0, u1, vf, z0, z1, n, col) { // sütunlar
    var w = (u1 - u0) / (n * 2 - 1);
    for (var i = 0; i < n; i++) this.rl(u0 + i * 2 * w, u0 + i * 2 * w + w, vf, z0, z1, col);
  };
  K.lot = function (n, col) { this.g(0.02, 0.02, n - 0.04, n - 0.04, col); };

  /* ===================== BİNA ÇİZİMLERİ ===================== */
  var A = art.defs = {};
  function def(id, hz, fn, extra) { A[id] = { hz: hz, draw: fn }; if (extra) for (var k in extra) A[id][k] = extra[k]; }
  var GRASS = '#7dbb58', PAVE = '#cfcabd', ASPH = '#6f7379', DIRT = '#b99b6b', WATER = '#4aa3df';
  var ROOFS = ['#b5533c', '#8d5a3b', '#4f6d8a', '#7a8b52'], WALLS = ['#f1e3c6', '#e9d3b0', '#f4efe6', '#ead9c9'];

  // -------- KONUT --------
  def('hut', 1.3, function (k, l, vr) {
    k.lot(1, GRASS);
    k.box(0.24, 0.26, 0.5, 0.5, 0, 0.36, ['#c9a070', '#b98f5f', '#d4b083', '#c0986a'][vr]);
    k.rl(0.42, 0.56, 0.76, 0, 0.24, '#6b4423'); k.wr(0.32, 0.7, 0.74, 0.05, 0.36, 1, 1);
    k.gb(0.19, 0.21, 0.6, 0.6, 0.36, 0.3, ROOFS[vr], 'u', '#c9a070');
    if (l > 1) k.tree(0.84, 0.2, 0.6, 0);
    if (l > 2) k.box(0.3, 0.3, 0.08, 0.08, 0.5, 0.25, '#8a6a55');
  });
  def('house', 1.6, function (k, l, vr) {
    k.lot(1, GRASS);
    k.box(0.18, 0.2, 0.62, 0.58, 0, 0.5, WALLS[vr]);
    k.rl(0.4, 0.52, 0.78, 0, 0.28, '#7a4b2a'); k.wl(0.2, 0.42, 0.78, 0.1, 0.5, 1, 1); k.wl(0.54, 0.78, 0.78, 0.1, 0.5, 1, 1);
    k.wr(0.24, 0.74, 0.8, 0.08, 0.5, 2, 1);
    k.gb(0.13, 0.15, 0.72, 0.68, 0.5, 0.38, ROOFS[vr], 'v', WALLS[vr]);
    k.box(0.6, 0.3, 0.09, 0.09, 0.6, 0.34, '#9c6b5a');
    if (l > 1) k.tree(0.12, 0.88, 0.55, 0);
    if (l > 2) k.g(0.82, 0.3, 0.14, 0.4, '#e7c0d0');
  });
  def('townhouse', 2.2, function (k, l, vr) {
    k.lot(2, PAVE); k.g(0.1, 1.45, 1.8, 0.45, GRASS);
    for (var i = 0; i < 3; i++) {
      var u = 0.14 + i * 0.58, w = WALLS[(vr + i) % 4], h = 0.86 + (l - 1) * 0.12;
      k.box(u, 0.3, 0.56, 1.1, 0, h, w);
      k.rl(u + 0.2, u + 0.36, 1.4, 0, 0.3, '#6e4930'); k.wl(u + 0.04, u + 0.52, 1.4, 0.4, h, 2, 1);
      if (i === 2) k.wr(0.36, 1.34, u + 0.56, 0.02, h, 3, 2);
      k.gb(u - 0.02, 0.26, 0.6, 1.18, h, 0.36, ROOFS[(vr + i) % 4], 'v', w);
    }
    k.tree(0.3, 1.72, 0.6, 0); k.tree(1.6, 1.72, 0.6, 0);
  });
  def('apartment', 3.4, function (k, l, vr) {
    k.lot(2, PAVE);
    var f = 4 + (l - 1), h = f * 0.48, c = ['#e8dcc8', '#d9c7b0', '#dfe3e6', '#e6d0c0'][vr];
    k.box(0.22, 0.22, 1.5, 1.5, 0, h, c);
    k.win(0.22, 0.22, 1.5, 1.5, 0.1, h, 4, f);
    k.rl(0.82, 1.1, 1.72, 0, 0.34, '#5d4636');
    k.box(0.18, 0.18, 1.58, 1.58, h, 0.06, shade(c, 0.85));
    k.box(0.5, 0.5, 0.4, 0.4, h + 0.06, 0.22, '#b9b3a8');
    k.tree(0.12, 1.85, 0.6, 0); k.tree(1.86, 1.86, 0.6, 0);
  });
  def('villa', 2.2, function (k, l) {
    k.lot(2, GRASS);
    k.g(1.15, 1.2, 0.65, 0.6, '#e6dcc6'); k.g(1.22, 1.27, 0.5, 0.46, WATER); // havuz
    k.box(0.2, 0.2, 0.75, 1.35, 0, 0.62, '#f6efe2');
    k.wl(0.24, 0.9, 1.55, 0.1, 0.62, 2, 1); k.wr(0.3, 1.45, 0.95, 0.1, 0.62, 3, 1, { px: 0.12 });
    k.hip(0.14, 0.14, 0.87, 1.47, 0.62, 0.36, '#c0664a');
    k.box(0.95, 0.25, 0.8, 0.7, 0, 0.5, '#f1e6d2');
    k.wl(1.0, 1.7, 0.95, 0.08, 0.5, 2, 1, { px: 0.12 }); k.wr(0.3, 0.9, 1.75, 0.08, 0.5, 2, 1);
    k.hip(0.9, 0.2, 0.9, 0.8, 0.5, 0.3, '#c0664a');
    k.tree(0.3, 1.8, 0.7, 0); k.tree(1.82, 1.84, 0.6, 1);
    if (l > 1) k.tree(1.86, 0.2, 0.7, 0);
    if (l > 2) k.box(1.25, 1.0, 0.3, 0.12, 0, 0.14, '#fff');
  });
  def('block', 5, function (k, l, vr) {
    k.lot(2, PAVE);
    var f = 7 + (l - 1), h = f * 0.48, c = ['#dfe4e8', '#e8e0d2', '#d7dde0', '#e5dccf'][vr], st = ['#3f7fbf', '#c0563e', '#3f9a7a', '#c79a32'][vr];
    k.box(0.2, 0.3, 1.6, 1.3, 0, h, c);
    k.win(0.2, 0.3, 1.6, 1.3, 0.1, h, 5, f, { cols2: 4 });
    k.rl(0.2, 0.36, 1.6, 0, h, st); k.rl(0.9, 1.1, 1.6, 0, 0.34, '#444');
    k.box(0.16, 0.26, 1.68, 1.38, h, 0.07, shade(c, 0.8));
    k.box(0.4, 0.5, 0.35, 0.35, h + 0.07, 0.25, '#aaa'); k.box(1.1, 0.7, 0.4, 0.3, h + 0.07, 0.15, '#999');
    k.tree(0.14, 1.84, 0.55, 0);
  });
  def('residence', 7.4, function (k, l) {
    k.lot(2, PAVE);
    var h = 5.2 + (l - 1) * 0.6, gc = '#5fa8c9';
    k.box(0.14, 0.14, 1.72, 1.72, 0, 0.5, '#d9d5cc'); k.win(0.14, 0.14, 1.72, 1.72, 0.08, 0.5, 6, 1, { px: 0.1 });
    k.box(0.34, 0.34, 1.3, 1.3, 0.5, h, gc);
    k.win(0.34, 0.34, 1.3, 1.3, 0.5, 0.5 + h, 5, Math.round(h / 0.42), { px: 0.07, pb: 0.1, pt: 0.1, col: '#9fd6f0', lit: 0.4, m: 0.02 });
    k.box(0.5, 0.5, 0.98, 0.98, 0.5 + h, 0.5, shade(gc, 0.9));
    k.win(0.5, 0.5, 0.98, 0.98, 0.5 + h, 1 + h, 4, 1, { px: 0.07, pb: 0.1, pt: 0.1, col: '#9fd6f0' });
    k.box(0.75, 0.75, 0.3, 0.3, 1 + h, 0.2, '#bbb');
    k.lamp(0.9, 0.9, 1.3 + h, 0.12, '#ff5a4a');
  });
  def('skyscraper', 12, function (k, l) {
    k.lot(3, PAVE);
    var h1 = 7 + (l - 1) * 0.7, gc = '#4f8fb5', o = { px: 0.06, pb: 0.1, pt: 0.1, col: '#8fcdea', lit: 0.4, m: 0.02 };
    k.box(0.2, 0.2, 2.6, 2.6, 0, 0.7, '#cfd2d6'); k.win(0.2, 0.2, 2.6, 2.6, 0.1, 0.7, 8, 1, { px: 0.1 });
    k.box(0.55, 0.55, 1.9, 1.9, 0.7, h1, gc); k.win(0.55, 0.55, 1.9, 1.9, 0.7, 0.7 + h1, 7, Math.round(h1 / 0.42), o);
    k.box(0.85, 0.85, 1.3, 1.3, 0.7 + h1, 1.8, shade(gc, 0.92)); k.win(0.85, 0.85, 1.3, 1.3, 0.7 + h1, 2.5 + h1, 5, 4, o);
    k.box(1.15, 1.15, 0.7, 0.7, 2.5 + h1, 0.6, shade(gc, 0.8));
    k.ln([1.5, 1.5, 3.1 + h1], [1.5, 1.5, 4.3 + h1], '#ddd', 1.6);
    k.lamp(1.5, 1.5, 4.3 + h1, 0.14, '#ff5a4a');
    k.tree(0.2, 2.8, 0.6, 0); k.tree(2.8, 2.8, 0.6, 0);
  });
  def('arcology', 9.5, function (k, l) {
    k.lot(3, '#bcd7a0');
    var o = { px: 0.06, pb: 0.12, pt: 0.12, col: '#bdeedd', lit: 0.5, m: 0.02 }, z = 0;
    for (var i = 0; i < 5; i++) {
      var m = 0.15 + i * 0.26, w = 3 - m * 2, h = 1.35 + (l - 1) * 0.12;
      k.box(m, m, w, w, z, h, '#eef3f0', { top: '#66b266' });
      k.win(m, m, w, w, z, z + h, Math.max(2, 9 - i * 2), 3, o);
      z += h;
      if (i < 4) { k.tree(m + 0.12, m + w - 0.12, 0.45, 0); k.tree(m + w - 0.12, m + 0.14, 0.45, 0); }
    }
    k.dome(1.5, 1.5, 0.3, z, '#9fe0d0'); k.lamp(1.5, 1.5, z + 0.5, 0.16, '#8ff');
  });

  // -------- TİCARET --------
  def('shop', 1.3, function (k, l, vr) {
    k.lot(1, PAVE);
    var c = ['#f0d9a8', '#e7c9b0', '#d6e2c8', '#e3d3e6'][vr], aw = ['#d9534f', '#3f8fbf', '#3fa56b', '#d98a2f'][vr];
    k.box(0.14, 0.18, 0.72, 0.6, 0, 0.5, c);
    k.wl(0.18, 0.56, 0.78, 0.06, 0.4, 2, 1, { px: 0.08, pb: 0.1, pt: 0.1, lit: 0.9 }); k.rl(0.62, 0.78, 0.78, 0, 0.32, '#6a4a34');
    k.wr(0.24, 0.72, 0.86, 0.1, 0.44, 2, 1);
    k.poly([[0.12, 0.78, 0.44], [0.88, 0.78, 0.44], [0.88, 0.9, 0.34], [0.12, 0.9, 0.34]], aw);
    k.box(0.14, 0.18, 0.72, 0.6, 0.5, 0.05, shade(c, 0.8));
    k.box(0.3, 0.66, 0.4, 0.06, 0.55, 0.14, aw);
    if (l > 1) k.box(0.2, 0.25, 0.2, 0.2, 0.55, 0.1, '#aaa');
  });
  def('market', 1.7, function (k, l) {
    k.lot(2, ASPH);
    for (var i = 0; i < 4; i++) k.g(0.3 + i * 0.4, 1.4, 0.03, 0.5, '#e8e8e8');
    k.box(0.15, 0.15, 1.7, 1.1, 0, 0.72, '#f3f1ea');
    k.wl(0.2, 1.8, 1.25, 0.05, 0.46, 6, 1, { px: 0.06, pb: 0.08, pt: 0.05, lit: 0.95 });
    k.rl(0.15, 1.85, 1.25, 0.5, 0.7, '#2f7fc1'); k.rl(0.8, 1.2, 1.25, 0.52, 0.68, '#ffd34d');
    k.wr(0.2, 1.2, 1.85, 0.1, 0.5, 3, 1);
    k.box(0.4, 0.4, 0.3, 0.3, 0.72, 0.12, '#b5b5b5'); k.box(1.1, 0.5, 0.4, 0.3, 0.72, 0.1, '#a5a5a5');
    if (l > 1) k.box(0.9, 1.0, 0.5, 0.08, 0.72, 0.3, '#2f7fc1');
  });
  def('restaurant', 1.4, function (k) {
    k.lot(1, PAVE);
    k.box(0.14, 0.14, 0.6, 0.62, 0, 0.46, '#e2a877');
    k.wl(0.18, 0.5, 0.76, 0.08, 0.4, 2, 1, { lit: 0.95 }); k.rl(0.54, 0.68, 0.76, 0, 0.3, '#5b3a25'); k.wr(0.2, 0.7, 0.74, 0.08, 0.4, 2, 1, { lit: 0.95 });
    k.hip(0.09, 0.09, 0.7, 0.72, 0.46, 0.3, '#8a3f33');
    k.cyl(0.86, 0.5, 0.05, 0, 0.14, '#c9b28a'); k.cone(0.86, 0.5, 0.15, 0.2, 0.14, '#e85d4a'); k.ln([0.86, 0.5, 0.14], [0.86, 0.5, 0.3], '#eee', 1);
    k.cyl(0.5, 0.88, 0.05, 0, 0.14, '#c9b28a'); k.cone(0.5, 0.88, 0.15, 0.2, 0.14, '#f2c14e');
  });
  def('office', 4.4, function (k, l) {
    k.lot(2, PAVE);
    var h = 2.7 + (l - 1) * 0.5, c = '#6f8fa8', o = { px: 0.07, pb: 0.12, pt: 0.12, col: '#a8d4ea', lit: 0.45, m: 0.03 };
    k.box(0.2, 0.2, 1.6, 1.6, 0, h, c); k.win(0.2, 0.2, 1.6, 1.6, 0.36, h, 6, Math.round(h / 0.44), o);
    k.wl(0.3, 1.7, 1.8, 0.03, 0.3, 5, 1, { px: 0.05, pb: 0.05, pt: 0.05, lit: 0.9 });
    k.box(0.2, 0.2, 1.6, 1.6, h, 0.07, '#dfe3e6');
    k.box(0.5, 0.5, 0.5, 0.4, h + 0.07, 0.2, '#b0b4b8'); k.ln([1.3, 0.6, h], [1.3, 0.6, h + 0.6], '#ccc', 1);
  });
  def('mall', 2.6, function (k, l) {
    k.lot(3, ASPH);
    for (var i = 0; i < 6; i++) k.g(0.3 + i * 0.42, 2.35, 0.03, 0.5, '#e8e8e8');
    k.box(0.15, 0.15, 2.7, 1.95, 0, 1.1, '#efe6d8');
    k.rl(0.15, 2.85, 2.1, 0.78, 1.04, '#c0392b'); k.rl(0.4, 0.9, 2.1, 0.82, 1.0, '#ffd34d'); k.rl(2.0, 2.6, 2.1, 0.82, 1.0, '#fff');
    k.wl(0.25, 1.1, 2.1, 0.08, 0.66, 3, 1, { px: 0.05, pb: 0.05, pt: 0.05, lit: 0.95 }); k.wl(1.9, 2.75, 2.1, 0.08, 0.66, 3, 1, { px: 0.05, pb: 0.05, pt: 0.05, lit: 0.95 });
    k.wr(0.25, 2.0, 2.85, 0.15, 0.9, 5, 2);
    k.box(1.15, 2.0, 0.7, 0.3, 0, 1.3, '#7fb8d8'); k.wl(1.18, 1.82, 2.3, 0.05, 1.25, 3, 3, { px: 0.06, pb: 0.06, pt: 0.06, col: '#c6e8f7', lit: 0.95 });
    k.dome(1.5, 1.1, 0.55, 1.1, '#9fd0e8', 0.6);
    k.box(0.4, 0.4, 0.4, 0.3, 1.1, 0.14, '#b0b0b0'); k.box(2.2, 0.5, 0.4, 0.4, 1.1, 0.14, '#a8a8a8');
    if (l > 1) k.flag(0.3, 2.0, 1.1, 0.7, '#e74c3c');
    if (l > 2) k.flag(2.7, 2.0, 1.1, 0.7, '#f1c40f');
  });
  def('hotel', 5.6, function (k, l) {
    k.lot(2, PAVE); k.g(0.15, 1.45, 0.8, 0.42, WATER); k.g(1.1, 1.4, 0.7, 0.5, GRASS);
    var h = 3.7 + (l - 1) * 0.5, c = '#f0d7b7';
    k.box(0.2, 0.25, 1.6, 1.0, 0, h, c); k.win(0.2, 0.25, 1.6, 1.0, 0.4, h, 6, Math.round(h / 0.44), { cols2: 3, lit: 0.6 });
    k.wl(0.3, 1.7, 1.25, 0.04, 0.34, 5, 1, { px: 0.05, pb: 0.05, pt: 0.05, lit: 0.95 });
    k.poly([[0.7, 1.25, 0.4], [1.3, 1.25, 0.4], [1.3, 1.5, 0.36], [0.7, 1.5, 0.36]], '#b03a48');
    k.box(0.2, 0.25, 1.6, 1.0, h, 0.08, '#b06a4a');
    k.box(0.75, 0.9, 0.5, 0.06, h + 0.08, 0.32, '#c0392b'); k.lamp(1.0, 0.96, h + 0.26, 0.2, '#ff6a5a');
    k.tree(1.75, 1.75, 0.55, 1);
  });
  def('bank', 2.6, function (k, l) {
    k.lot(2, PAVE);
    k.box(0.12, 0.12, 1.76, 1.76, 0, 0.14, '#d8d2c4'); k.box(0.2, 0.2, 1.6, 1.52, 0.14, 0.08, '#e3ddd0');
    k.box(0.28, 0.28, 1.44, 1.3, 0.22, 1.2, '#ebe5d6');
    k.cols(0.32, 1.68, 1.58, 0.22, 1.36, 6, '#fbf8ee'); k.rl(0.86, 1.14, 1.58, 0.22, 0.8, '#5a4632');
    k.wr(0.36, 1.5, 1.72, 0.4, 1.3, 4, 2, { lit: 0.3 });
    k.gb(0.22, 0.22, 1.56, 1.42, 1.42, 0.42, '#b9a67a', 'v', '#ebe5d6');
    if (l > 1) k.ball(1.0, 1.58, 1.62, 0.05, '#f2c94c');
    if (l > 2) k.flag(1.0, 0.9, 1.84, 0.5, '#2e86c1');
  });
  def('plaza', 11, function (k, l) {
    k.lot(3, PAVE);
    var o = { px: 0.06, pb: 0.1, pt: 0.1, col: '#9bd4ec', lit: 0.5, m: 0.02 }, e = (l - 1) * 0.6;
    k.box(0.2, 0.2, 2.6, 2.6, 0, 0.6, '#c9ccd1'); k.win(0.2, 0.2, 2.6, 2.6, 0.08, 0.6, 9, 1, { px: 0.08 });
    k.box(0.4, 0.4, 1.05, 1.05, 0.6, 8.2 + e, '#3f7896'); k.win(0.4, 0.4, 1.05, 1.05, 0.6, 8.8 + e, 4, 19, o);
    k.box(0.6, 0.6, 0.65, 0.65, 8.8 + e, 0.5, '#335f78'); k.ln([0.92, 0.92, 9.3 + e], [0.92, 0.92, 10.1 + e], '#ddd', 1.5); k.lamp(0.92, 0.92, 10.1 + e, 0.14, '#ff5a4a');
    k.box(1.6, 1.6, 1.0, 1.0, 0.6, 6.2 + e, '#4a8c8a'); k.win(1.6, 1.6, 1.0, 1.0, 0.6, 6.8 + e, 4, 14, o);
    k.box(1.75, 1.75, 0.7, 0.7, 6.8 + e, 0.3, '#3a706e');
    k.box(1.3, 1.75, 0.4, 0.3, 4.0, 0.3, '#8fc7dd');
  });

  // -------- SANAYİ --------
  def('lumber', 1.2, function (k) {
    k.lot(1, '#9bbf6a');
    k.box(0.14, 0.14, 0.5, 0.42, 0, 0.32, '#a87b4f'); k.rl(0.3, 0.44, 0.56, 0, 0.24, '#5d3f25');
    k.gb(0.1, 0.1, 0.58, 0.5, 0.32, 0.24, '#6f5136', 'u', '#a87b4f');
    for (var i = 0; i < 3; i++) k.box(0.2 + i * 0.03, 0.68 + i * 0.07, 0.5, 0.07, 0, 0.07, '#c89b62', { right: '#f0d8a8' });
    k.box(0.24, 0.72, 0.46, 0.07, 0.07, 0.07, '#b98c57', { right: '#f0d8a8' });
    k.cyl(0.82, 0.3, 0.07, 0, 0.08, '#8a6238', '#e8cf9f'); k.tree(0.86, 0.84, 0.5, 1);
  });
  def('farm', 1.9, function (k, l) {
    k.lot(2, '#8fc063');
    for (var i = 0; i < 7; i++) k.g(0.1 + i * 0.13, 1.02, 0.07, 0.9, i % 2 ? '#d8c25a' : '#6fa544');
    for (i = 0; i < 6; i++) k.g(1.08, 1.05 + i * 0.14, 0.82, 0.07, '#c9a24a');
    k.box(0.2, 0.2, 0.8, 0.62, 0, 0.5, '#b8433a'); k.rl(0.48, 0.74, 0.82, 0, 0.36, '#f3ead7'); k.wr(0.3, 0.72, 1.0, 0.14, 0.44, 2, 1, { col: '#f3ead7' });
    k.gb(0.15, 0.15, 0.9, 0.72, 0.5, 0.36, '#7a2f2a', 'v', '#b8433a');
    k.cyl(1.45, 0.45, 0.2, 0, 0.9 + (l - 1) * 0.15, '#d9dde0'); k.cone(1.45, 0.45, 0.21, 0.9 + (l - 1) * 0.15, 0.2, '#9aa3ab');
    if (l > 1) { k.cyl(1.78, 0.75, 0.14, 0, 0.6, '#d0d4d8'); k.cone(1.78, 0.75, 0.15, 0.6, 0.16, '#9aa3ab'); }
  });
  def('quarry', 1.6, function (k) {
    k.lot(2, '#a8a091');
    k.poly([[0.3, 0.5, 0], [1.5, 0.3, 0], [1.75, 1.3, 0], [1.0, 1.75, 0], [0.25, 1.35, 0]], '#8c8577');
    k.poly([[0.55, 0.7, 0], [1.35, 0.55, 0], [1.5, 1.2, 0], [0.95, 1.5, 0], [0.5, 1.2, 0]], '#746e62');
    k.poly([[0.8, 0.85, 0], [1.2, 0.8, 0], [1.25, 1.1, 0], [0.95, 1.25, 0], [0.75, 1.1, 0]], '#5d584f');
    k.cone(0.4, 1.65, 0.2, 0, 0.26, '#b3ad9f'); k.cone(1.65, 1.62, 0.16, 0, 0.2, '#9f998c');
    k.box(1.5, 0.15, 0.36, 0.3, 0, 0.3, '#d6a243'); k.gb(1.48, 0.13, 0.4, 0.34, 0.3, 0.14, '#7d6a48', 'u', '#d6a243');
    k.ln([0.3, 0.3, 0], [0.3, 0.3, 0.9], '#e0b23a', 2); k.ln([0.3, 0.3, 0.9], [1.0, 0.95, 0.5], '#e0b23a', 1.6); k.ln([1.0, 0.95, 0.5], [1.0, 0.95, 0.2], '#444', 0.8);
  });
  def('fishery', 1.2, function (k) {
    k.lot(1, '#c7a977');
    for (var i = 0; i < 5; i++) k.g(0.06, 0.08 + i * 0.18, 0.88, 0.02, '#a58658');
    k.box(0.18, 0.18, 0.46, 0.42, 0, 0.34, '#5e9fc4'); k.rl(0.32, 0.44, 0.6, 0, 0.24, '#f1ead8'); k.wr(0.24, 0.54, 0.64, 0.1, 0.3, 1, 1);
    k.gb(0.14, 0.14, 0.54, 0.5, 0.34, 0.22, '#e9e2cf', 'u', '#5e9fc4');
    k.cyl(0.8, 0.3, 0.07, 0, 0.14, '#9b6b3f'); k.cyl(0.84, 0.48, 0.07, 0, 0.14, '#8a5d36');
    k.box(0.2, 0.74, 0.5, 0.14, 0, 0.07, '#f3f3f3', { top: '#c95b4a' });
    k.ln([0.45, 0.8, 0.07], [0.45, 0.8, 0.4], '#ddd', 1);
  });
  def('mine', 2.3, function (k) {
    k.lot(2, '#a39178');
    k.box(0.2, 0.2, 0.8, 0.6, 0, 0.5, '#7f6f5c'); k.gb(0.16, 0.16, 0.88, 0.68, 0.5, 0.24, '#5a6570', 'u', '#7f6f5c'); k.rl(0.45, 0.75, 0.8, 0, 0.36, '#2f2a25');
    k.ln([1.25, 0.4, 0], [1.4, 0.55, 1.5], '#4b4f55', 2); k.ln([1.55, 0.4, 0], [1.4, 0.55, 1.5], '#4b4f55', 2);
    k.ln([1.25, 0.7, 0], [1.4, 0.55, 1.5], '#4b4f55', 2); k.ln([1.55, 0.7, 0], [1.4, 0.55, 1.5], '#4b4f55', 2);
    k.cyl(1.4, 0.55, 0.12, 1.42, 0.12, '#c94f3d'); k.ln([1.4, 0.55, 1.5], [0.9, 1.4, 0.1], '#333', 0.8);
    k.cone(0.6, 1.45, 0.34, 0, 0.42, '#4e4a52'); k.cone(1.35, 1.5, 0.26, 0, 0.3, '#6b5a4a');
    k.box(1.6, 1.1, 0.2, 0.34, 0, 0.14, '#d6a243');
  });
  def('steelmill', 3.4, function (k, l) {
    k.lot(2, '#8d8a86');
    k.box(0.15, 0.3, 1.2, 1.2, 0, 0.8, '#77706b');
    k.wl(0.2, 1.3, 1.5, 0.45, 0.74, 5, 1, { col: '#ffb057', lit: 1, px: 0.15 }); k.rl(0.5, 0.95, 1.5, 0, 0.4, '#3a3532');
    k.wr(0.4, 1.4, 1.35, 0.45, 0.74, 4, 1, { col: '#ffb057', lit: 1, px: 0.15 });
    for (var i = 0; i < 3; i++) k.gb(0.15 + i * 0.4, 0.3, 0.4, 1.2, 0.8, 0.2, '#5b5651', 'v', '#77706b');
    k.cyl(1.62, 0.5, 0.11, 0, 2.3 + (l - 1) * 0.25, '#b5553f'); k.cyl(1.62, 0.5, 0.115, 1.5, 0.25, '#f1ece2');
    k.cyl(1.62, 0.95, 0.11, 0, 1.9 + (l - 1) * 0.25, '#b5553f'); k.cyl(1.62, 0.95, 0.115, 1.2, 0.25, '#f1ece2');
    k.cyl(1.55, 1.55, 0.2, 0, 0.45, '#8e959b');
    k.lamp(0.72, 1.5, 0.2, 0.3, '#ff8a3a');
  }, { smoke: [[1.62, 0.5, 2.4, '#777'], [1.62, 0.95, 2.0, '#888']] });
  def('factory', 2.8, function (k, l) {
    k.lot(2, '#9a9893');
    k.box(0.15, 0.15, 1.25, 1.4, 0, 0.75, '#c9b79c');
    k.wl(0.2, 1.35, 1.55, 0.3, 0.68, 5, 1, { px: 0.12 }); k.rl(0.2, 0.55, 1.55, 0, 0.26, '#51606b');
    k.wr(0.25, 1.45, 1.4, 0.3, 0.68, 5, 1, { px: 0.12 });
    for (var i = 0; i < 4; i++) k.gb(0.15, 0.15 + i * 0.35, 1.25, 0.35, 0.75, 0.2, '#4f7fa3', 'u', '#c9b79c');
    k.cyl(1.66, 0.4, 0.1, 0, 2.0 + (l - 1) * 0.2, '#a9a39a'); k.cyl(1.66, 0.4, 0.105, 1.7, 0.2, '#c0392b');
    k.cyl(1.62, 0.95, 0.19, 0, 0.6, '#d7dbdf'); k.cyl(1.62, 1.45, 0.19, 0, 0.6, '#d7dbdf');
    k.box(0.5, 1.7, 0.3, 0.2, 0, 0.16, '#c98b3a'); k.box(0.9, 1.72, 0.2, 0.18, 0, 0.14, '#5a8f3a');
  }, { smoke: [[1.66, 0.4, 2.1, '#999']] });
  def('greenhouse', 1.3, function (k) {
    k.lot(2, '#8fc063');
    for (var i = 0; i < 2; i++) {
      var v = 0.18 + i * 0.86;
      k.box(0.15, v, 1.7, 0.7, 0, 0.3, '#cfeee0', { top: '#dff7ec' });
      k.wl(0.18, 1.82, v + 0.7, 0.03, 0.28, 8, 1, { px: 0.07, pb: 0.05, pt: 0.05, col: '#a7e3c8', lit: 0.9 });
      k.gb(0.15, v, 1.7, 0.7, 0.3, 0.24, '#bff0dc', 'u', '#cfeee0');
      for (var j = 1; j < 8; j++) k.ln([0.15 + j * 0.2125, v + 0.7, 0.3], [0.15 + j * 0.2125, v + 0.35, 0.54], '#f4fffa', 0.7);
    }
  });
  def('techfab', 2.4, function (k, l) {
    k.lot(3, '#c5c9c7');
    k.box(0.2, 0.2, 2.6, 1.7, 0, 0.95, '#f2f4f5'); k.rl(0.2, 2.8, 1.9, 0.62, 0.8, '#2a7fc9');
    k.wl(0.25, 2.75, 1.9, 0.1, 0.5, 9, 1, { px: 0.08, pb: 0.1, pt: 0.1, lit: 0.8 }); k.wr(0.3, 1.8, 2.8, 0.1, 0.8, 5, 2);
    for (var i = 0; i < 4; i++) k.box(0.45 + i * 0.6, 0.5, 0.36, 0.5, 0.95, 0.12, '#aeb6bb');
    k.cyl(2.45, 1.4, 0.16, 0.95, 0.5, '#d5dadd');
    k.box(0.3, 2.05, 1.0, 0.7, 0, 0.6 + (l - 1) * 0.3, '#6fa6c9'); k.win(0.3, 2.05, 1.0, 0.7, 0.05, 0.6 + (l - 1) * 0.3, 4, 2, { px: 0.06, pb: 0.1, pt: 0.1 });
    k.tree(2.2, 2.5, 0.6, 0); k.tree(2.7, 2.6, 0.5, 0); k.tree(1.7, 2.6, 0.5, 1);
  });

  // -------- ALTYAPI --------
  def('wind', 3.2, function (k) {
    k.disc(0.5, 0.5, 0.2, 0, '#b9b9b0');
    k.taper(0.5, 0.5, 0.055, 0.03, 0, 2.2, '#f2f2f2');
    k.box(0.44, 0.46, 0.16, 0.08, 2.18, 0.08, '#e3e3e3');
  }, { anim: { t: 'wind', u: 0.56, v: 0.56, z: 2.22 } });
  def('watertower', 2.2, function (k, l) {
    k.disc(0.5, 0.5, 0.3, 0, '#b9b9b0');
    var c = '#8a8f96';
    k.ln([0.28, 0.5, 0], [0.36, 0.5, 1.0], c, 2); k.ln([0.5, 0.28, 0], [0.5, 0.36, 1.0], c, 2);
    k.ln([0.5, 0.72, 0], [0.5, 0.64, 1.0], c, 2); k.ln([0.72, 0.5, 0], [0.64, 0.5, 1.0], c, 2);
    k.ln([0.5, 0.5, 0], [0.5, 0.5, 1.0], '#6f8fb0', 2.5);
    k.cyl(0.5, 0.5, 0.26, 1.0, 0.46 + (l - 1) * 0.1, '#5f9fd0'); k.cyl(0.5, 0.5, 0.265, 1.15, 0.08, '#e9eef2');
    k.cone(0.5, 0.5, 0.28, 1.46 + (l - 1) * 0.1, 0.2, '#3f6f96');
  });
  def('coal', 3.6, function (k, l) {
    k.lot(2, '#8a8780');
    k.box(0.15, 0.3, 1.0, 1.1, 0, 0.9, '#6d6660');
    k.wl(0.2, 1.1, 1.4, 0.5, 0.82, 4, 1, { col: '#ffb057', lit: 1 }); k.rl(0.4, 0.8, 1.4, 0, 0.4, '#3a3532'); k.wr(0.4, 1.3, 1.15, 0.5, 0.82, 3, 1, { col: '#ffb057', lit: 1 });
    k.box(0.15, 0.3, 1.0, 1.1, 0.9, 0.06, '#4f4944');
    k.taper(1.5, 0.45, 0.2, 0.14, 0, 2.3 + (l - 1) * 0.3, '#b9b3aa'); k.cyl(1.5, 0.45, 0.145, 2.0 + (l - 1) * 0.3, 0.14, '#c0392b');
    k.taper(1.52, 1.0, 0.18, 0.13, 0, 1.9 + (l - 1) * 0.3, '#b0aaa1'); k.cyl(1.52, 1.0, 0.135, 1.6 + (l - 1) * 0.3, 0.14, '#c0392b');
    k.cone(0.6, 1.68, 0.3, 0, 0.3, '#2b2b2e'); k.cone(1.2, 1.7, 0.24, 0, 0.24, '#333338');
  }, { smoke: [[1.5, 0.45, 2.4, '#666'], [1.52, 1.0, 2.0, '#777']] });
  def('pump', 1.2, function (k) {
    k.lot(1, '#b9bdb8');
    k.box(0.16, 0.16, 0.44, 0.44, 0, 0.42, '#3f86b8'); k.rl(0.3, 0.44, 0.6, 0, 0.26, '#dfe7ec'); k.box(0.14, 0.14, 0.48, 0.48, 0.42, 0.05, '#2c6a94');
    k.cyl(0.76, 0.34, 0.15, 0, 0.5, '#d5dde2'); k.cyl(0.76, 0.34, 0.155, 0.2, 0.06, '#3f86b8');
    k.box(0.3, 0.72, 0.56, 0.1, 0.04, 0.1, '#7d8b94'); k.box(0.7, 0.5, 0.1, 0.3, 0.04, 0.1, '#7d8b94');
  });
  def('solar', 1, function (k) {
    k.lot(2, '#9fca78');
    for (var j = 0; j < 4; j++) for (var i = 0; i < 3; i++) {
      var u = 0.14 + i * 0.6, v = 0.14 + j * 0.45;
      k.poly([[u, v, 0.3], [u + 0.5, v, 0.3], [u + 0.5, v + 0.34, 0.08], [u, v + 0.34, 0.08]], '#243a6b', '#8ea3c7');
      k.ln([u + 0.25, v, 0.3], [u + 0.25, v + 0.34, 0.08], '#8ea3c7', 0.6); k.ln([u, v + 0.17, 0.19], [u + 0.5, v + 0.17, 0.19], '#8ea3c7', 0.6);
      k.ln([u + 0.5, v, 0], [u + 0.5, v, 0.3], '#777', 1);
    }
  });
  def('treatment', 1.5, function (k, l) {
    k.lot(2, '#b4bab4');
    k.cyl(0.55, 0.6, 0.38, 0, 0.16, '#c9ced1', '#4a9cc9'); k.ln([0.2, 0.6, 0.18], [0.9, 0.6, 0.18], '#e8e8e8', 1.4);
    k.cyl(1.4, 0.55, 0.34, 0, 0.16, '#c9ced1', '#5cabd3'); k.ln([1.4, 0.24, 0.18], [1.4, 0.86, 0.18], '#e8e8e8', 1.4);
    k.cyl(0.6, 1.45, 0.34, 0, 0.16, '#c9ced1', '#3f8fbd');
    k.box(1.1, 1.15, 0.7, 0.6, 0, 0.5 + (l - 1) * 0.15, '#e6eaec'); k.wl(1.14, 1.76, 1.75, 0.1, 0.44, 3, 1); k.box(1.08, 1.13, 0.74, 0.64, 0.5 + (l - 1) * 0.15, 0.05, '#3f86b8');
  });
  def('nuclear', 5, function (k, l) {
    k.lot(3, '#b5b8b2');
    function tower(cu, cv, hh) { k.taper(cu, cv, 0.55, 0.36, 0, hh * 0.62, '#dcdad3'); k.taper(cu, cv, 0.36, 0.44, hh * 0.62, hh * 0.38, '#e6e4dd', '#6f6c66'); }
    tower(0.75, 0.75, 3.2 + (l - 1) * 0.3); tower(2.0, 0.7, 3.2 + (l - 1) * 0.3);
    k.cyl(1.0, 2.0, 0.5, 0, 0.7, '#e9ecef'); k.dome(1.0, 2.0, 0.5, 0.7, '#f4f6f8', 0.8);
    k.box(1.7, 1.6, 1.05, 1.0, 0, 0.7, '#cfd5da'); k.wl(1.75, 2.7, 2.6, 0.2, 0.6, 4, 1); k.wr(1.7, 2.5, 2.75, 0.2, 0.6, 3, 1);
    k.rl(1.7, 2.75, 2.6, 0.62, 0.7, '#f1c40f');
    k.lamp(1.0, 2.0, 1.25, 0.14, '#ff5a4a');
  }, { smoke: [[0.75, 0.75, 3.3, '#fff'], [2.0, 0.7, 3.3, '#fff']] });
  def('fusion', 4.2, function (k, l) {
    k.lot(3, '#aeb6c2');
    k.cyl(1.5, 1.5, 1.2, 0, 0.5, '#d9dfe6'); k.cyl(1.5, 1.5, 1.0, 0.5, 0.5, '#c2cad4');
    k.disc(1.5, 1.5, 0.95, 1.0, '#5ad1ff', '#e9f8ff'); k.disc(1.5, 1.5, 0.6, 1.0, '#c2cad4');
    k.dome(1.5, 1.5, 0.55, 1.0, '#eaf2f8', 0.9);
    k.lamp(1.5, 1.5, 1.55, 0.6, '#5ad1ff'); k.lamp(0.6, 1.9, 1.0, 0.3, '#5ad1ff'); k.lamp(2.3, 1.9, 1.0, 0.3, '#5ad1ff');
    for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2 + 0.78; k.box(1.5 + Math.cos(a) * 1.25 - 0.14, 1.5 + Math.sin(a) * 1.25 - 0.14, 0.28, 0.28, 0, 1.3 + (l - 1) * 0.2, '#7f8fa3'); }
    k.ln([1.5, 1.5, 1.5], [1.5, 1.5, 2.6], '#dfe7ee', 1.6);
  });

  // -------- HİZMET --------
  def('police', 1.5, function (k, l) {
    k.lot(1, PAVE);
    k.box(0.14, 0.16, 0.72, 0.64, 0, 0.56 + (l - 1) * 0.12, '#e8eef4'); var h = 0.56 + (l - 1) * 0.12;
    k.rl(0.14, 0.86, 0.8, h - 0.14, h - 0.04, '#2456a6'); k.rr(0.16, 0.8, 0.86, h - 0.14, h - 0.04, '#1c4585');
    k.wl(0.18, 0.5, 0.8, 0.1, 0.4, 2, 1); k.rl(0.58, 0.74, 0.8, 0, 0.3, '#2456a6'); k.wr(0.22, 0.74, 0.86, 0.1, 0.4, 2, 1);
    k.box(0.12, 0.14, 0.76, 0.68, h, 0.05, '#c5ced8');
    k.box(0.44, 0.44, 0.1, 0.1, h + 0.05, 0.1, '#2a6fdb'); k.lamp(0.49, 0.49, h + 0.2, 0.22, '#4f8dff');
    k.flag(0.2, 0.2, h, 0.5, '#e74c3c');
  });
  def('fire', 1.9, function (k, l) {
    k.lot(1, PAVE);
    k.box(0.12, 0.2, 0.6, 0.6, 0, 0.5, '#cf4436');
    k.rl(0.16, 0.4, 0.8, 0, 0.36, '#f3ecdf'); k.rl(0.44, 0.68, 0.8, 0, 0.36, '#f3ecdf');
    k.ln([0.16, 0.8, 0.18], [0.4, 0.8, 0.18], '#bbb', 0.6); k.ln([0.44, 0.8, 0.18], [0.68, 0.8, 0.18], '#bbb', 0.6);
    k.wr(0.26, 0.74, 0.72, 0.12, 0.44, 2, 1); k.box(0.1, 0.18, 0.64, 0.64, 0.5, 0.05, '#8f2b22');
    var th = 1.1 + (l - 1) * 0.2;
    k.box(0.7, 0.16, 0.2, 0.2, 0, th, '#d9d2c4'); k.wl(0.72, 0.88, 0.36, 0.2, th, 1, 3); k.hip(0.67, 0.13, 0.26, 0.26, th, 0.2, '#8f2b22');
    k.lamp(0.42, 0.8, 0.44, 0.16, '#ff5a4a');
  });
  def('clinic', 1.3, function (k, l) {
    k.lot(1, PAVE);
    var h = 0.56 + (l - 1) * 0.14;
    k.box(0.14, 0.16, 0.72, 0.64, 0, h, '#f7f9fa');
    k.wl(0.18, 0.46, 0.8, 0.12, 0.42, 2, 1); k.rl(0.6, 0.76, 0.8, 0, 0.3, '#8fbfd9'); k.wr(0.22, 0.74, 0.86, 0.12, 0.42, 2, 1);
    k.rl(0.14, 0.86, 0.8, h - 0.08, h, '#e74c3c');
    k.box(0.12, 0.14, 0.76, 0.68, h, 0.05, '#d6dde2');
    k.box(0.36, 0.5, 0.28, 0.05, h + 0.05, 0.3, '#fff'); k.cross(0.5, 0.55, h + 0.2, 0.2, '#e74c3c');
    k.lamp(0.5, 0.56, h + 0.2, 0.16, '#ff6a5a');
  });
  def('school', 2.2, function (k, l) {
    k.lot(2, PAVE); k.g(1.0, 1.25, 0.9, 0.65, '#d9905a');
    k.ln([1.1, 1.3, 0.01], [1.8, 1.3, 0.01], '#fff', 0.7); k.ln([1.1, 1.85, 0.01], [1.8, 1.85, 0.01], '#fff', 0.7); k.ln([1.45, 1.3, 0.01], [1.45, 1.85, 0.01], '#fff', 0.7);
    var h = 0.9 + (l - 1) * 0.2;
    k.box(0.15, 0.15, 1.7, 0.8, 0, h, '#f2d489'); k.wl(0.2, 1.8, 0.95, 0.1, h, 7, 2); k.wr(0.2, 0.9, 1.85, 0.1, h, 3, 2);
    k.gb(0.1, 0.1, 1.8, 0.9, h, 0.4, '#b5533c', 'u', '#f2d489');
    k.box(0.15, 0.95, 0.7, 0.85, 0, 0.7, '#f2d489'); k.wl(0.2, 0.8, 1.8, 0.1, 0.62, 2, 1); k.rl(0.4, 0.6, 1.8, 0, 0.34, '#7a4b2a'); k.wr(1.0, 1.75, 0.85, 0.1, 0.62, 3, 1);
    k.gb(0.1, 0.95, 0.8, 0.9, 0.7, 0.34, '#b5533c', 'v', '#f2d489');
    k.flag(1.0, 1.1, 0, 1.0, '#e74c3c');
  });
  def('library', 1.6, function (k, l) {
    k.lot(1, PAVE);
    k.box(0.1, 0.1, 0.8, 0.8, 0, 0.08, '#d8d2c4');
    var h = 0.6 + (l - 1) * 0.12;
    k.box(0.16, 0.16, 0.68, 0.6, 0.08, h, '#e9e0cc'); k.cols(0.2, 0.8, 0.76, 0.08, 0.08 + h, 4, '#faf6ea'); k.rl(0.44, 0.56, 0.76, 0.08, 0.4, '#5a4632');
    k.wr(0.22, 0.7, 0.84, 0.2, 0.08 + h, 3, 1);
    k.gb(0.12, 0.12, 0.76, 0.68, 0.08 + h, 0.3, '#3f8f8a', 'v', '#e9e0cc');
  });
  def('highschool', 2.7, function (k, l) {
    k.lot(2, PAVE); k.g(0.15, 1.3, 1.7, 0.58, '#5fae5a');
    k.ln([0.2, 1.33, 0.01], [1.8, 1.33, 0.01], '#fff', 0.7); k.ln([0.2, 1.85, 0.01], [1.8, 1.85, 0.01], '#fff', 0.7); k.ln([1.0, 1.33, 0.01], [1.0, 1.85, 0.01], '#fff', 0.7); k.disc(1.0, 1.59, 0.14, 0.01, 'rgba(255,255,255,0.35)');
    var h = 1.4 + (l - 1) * 0.3;
    k.box(0.15, 0.15, 1.7, 1.0, 0, h, '#c97f5a'); k.wl(0.2, 1.8, 1.15, 0.1, h, 8, 3); k.wr(0.2, 1.1, 1.85, 0.1, h, 4, 3);
    k.rl(0.86, 1.14, 1.15, 0, 0.36, '#4a3526'); k.box(0.12, 0.12, 1.76, 1.06, h, 0.07, '#8a4f36');
    k.box(0.82, 0.9, 0.36, 0.25, h, 0.4, '#d9c9a8'); k.clock(1.0, 1.15, h + 0.2, 0.11); k.hip(0.78, 0.86, 0.44, 0.33, h + 0.4, 0.2, '#8a4f36');
  });
  def('hospital', 4, function (k, l) {
    k.lot(3, PAVE); k.g(0.2, 2.3, 2.6, 0.5, ASPH);
    var h = 2.4 + (l - 1) * 0.45;
    k.box(0.2, 0.25, 0.8, 1.9, 0, 1.4, '#f4f7f9'); k.wl(0.24, 0.96, 2.15, 0.1, 1.4, 3, 3); k.wr(0.3, 2.1, 1.0, 0.1, 1.4, 6, 3);
    k.box(2.0, 0.25, 0.8, 1.9, 0, 1.4, '#f4f7f9'); k.wl(2.04, 2.76, 2.15, 0.1, 1.4, 3, 3); k.wr(0.3, 2.1, 2.8, 0.1, 1.4, 6, 3);
    k.box(0.9, 0.4, 1.2, 1.3, 0, h, '#eef3f6'); k.wl(0.95, 2.05, 1.7, 0.4, h, 5, Math.round((h - 0.4) / 0.45)); k.wr(0.5, 1.6, 2.1, 1.4, h, 4, Math.round((h - 1.4) / 0.45) || 1);
    k.rl(1.3, 1.7, 1.7, 0, 0.38, '#8fbfd9'); k.poly([[1.15, 1.7, 0.42], [1.85, 1.7, 0.42], [1.85, 2.0, 0.38], [1.15, 2.0, 0.38]], '#e74c3c');
    k.rl(0.9, 2.1, 1.7, h - 0.1, h, '#e74c3c'); k.cross(1.5, 1.7, h - 0.36, 0.3, '#e74c3c');
    k.disc(1.5, 1.05, 0.38, h, '#7a8288'); k.disc(1.5, 1.05, 0.3, h, '#e9c84a'); k.disc(1.5, 1.05, 0.24, h, '#7a8288');
    k.lamp(1.5, 1.72, h - 0.36, 0.26, '#ff6a5a');
  });
  def('policehq', 4.3, function (k, l) {
    k.lot(2, PAVE);
    var h = 2.6 + (l - 1) * 0.4;
    k.box(0.15, 0.15, 1.7, 1.7, 0, 0.6, '#dfe6ee'); k.win(0.15, 0.15, 1.7, 1.7, 0.1, 0.6, 6, 1);
    k.box(0.35, 0.35, 1.2, 1.2, 0.6, h - 0.6, '#3f5f8f'); k.win(0.35, 0.35, 1.2, 1.2, 0.6, h, 5, Math.round((h - 0.6) / 0.42), { px: 0.1, pb: 0.15, pt: 0.15, col: '#b7d3ee' });
    k.rl(0.35, 1.55, 1.55, h - 0.12, h, '#f1c40f'); k.box(0.33, 0.33, 1.24, 1.24, h, 0.06, '#2c456b');
    k.ln([0.95, 0.95, h], [0.95, 0.95, h + 1.0], '#ccc', 1.5); k.lamp(0.95, 0.95, h + 1.0, 0.12, '#ff5a4a');
    k.box(0.5, 0.5, 0.14, 0.14, h + 0.06, 0.12, '#2a6fdb'); k.lamp(0.57, 0.57, h + 0.24, 0.3, '#4f8dff');
  });
  def('firehq', 3.6, function (k, l) {
    k.lot(2, PAVE);
    k.box(0.15, 0.3, 1.2, 1.2, 0, 0.75, '#cf4436');
    for (var i = 0; i < 3; i++) { k.rl(0.2 + i * 0.38, 0.52 + i * 0.38, 1.5, 0, 0.5, '#f3ecdf'); k.ln([0.2 + i * 0.38, 1.5, 0.25], [0.52 + i * 0.38, 1.5, 0.25], '#bbb', 0.6); }
    k.wr(0.4, 1.4, 1.35, 0.2, 0.66, 3, 1); k.rl(0.15, 1.35, 1.5, 0.56, 0.7, '#f3ecdf'); k.box(0.12, 0.27, 1.26, 1.26, 0.75, 0.06, '#8f2b22');
    var th = 2.2 + (l - 1) * 0.3;
    k.box(1.42, 0.3, 0.4, 0.4, 0, th, '#e6dfd2'); k.wl(1.45, 1.79, 0.7, 0.2, th, 1, 5); k.wr(0.33, 0.67, 1.82, 0.2, th, 1, 5); k.hip(1.38, 0.26, 0.48, 0.48, th, 0.3, '#8f2b22');
    k.lamp(0.75, 1.5, 0.63, 0.22, '#ff5a4a');
  });
  def('university', 3.8, function (k, l) {
    k.lot(3, '#8ec46a'); k.g(1.3, 1.8, 0.4, 1.15, PAVE); k.g(0.2, 2.2, 2.6, 0.3, PAVE);
    var h = 1.3 + (l - 1) * 0.2;
    k.box(0.2, 0.3, 0.8, 1.4, 0, 1.0, '#d9b38c'); k.wl(0.24, 0.96, 1.7, 0.1, 1.0, 3, 2); k.wr(0.36, 1.64, 1.0, 0.1, 1.0, 5, 2); k.gb(0.15, 0.25, 0.9, 1.5, 1.0, 0.36, '#7a4a3a', 'v', '#d9b38c');
    k.box(2.0, 0.3, 0.8, 1.4, 0, 1.0, '#d9b38c'); k.wl(2.04, 2.76, 1.7, 0.1, 1.0, 3, 2); k.wr(0.36, 1.64, 2.8, 0.1, 1.0, 5, 2); k.gb(1.95, 0.25, 0.9, 1.5, 1.0, 0.36, '#7a4a3a', 'v', '#d9b38c');
    k.box(0.95, 0.4, 1.1, 1.2, 0, h, '#ead9bd'); k.cols(1.0, 2.0, 1.6, 0.12, h, 6, '#fbf6ea'); k.rl(1.4, 1.6, 1.6, 0, 0.5, '#5a4632'); k.wr(0.5, 1.5, 2.05, 1.05, h, 3, 1);
    k.box(0.9, 0.35, 1.2, 1.3, h, 0.08, '#cdb99a'); k.cyl(1.5, 1.0, 0.36, h + 0.08, 0.3, '#ead9bd'); k.dome(1.5, 1.0, 0.36, h + 0.38, '#4f8f8a');
    k.ln([1.5, 1.0, h + 0.7], [1.5, 1.0, h + 1.1], '#f1c40f', 1.2);
    k.tree(0.4, 2.6, 0.7, 0); k.tree(1.0, 2.65, 0.6, 0); k.tree(2.1, 2.65, 0.6, 0); k.tree(2.65, 2.6, 0.7, 0);
  });
  def('lab', 2.6, function (k, l) {
    k.lot(2, '#c9ced0');
    var h = 0.9 + (l - 1) * 0.25;
    k.box(0.15, 0.2, 1.1, 1.5, 0, h, '#f1f4f6'); k.rl(0.15, 1.25, 1.7, h - 0.2, h - 0.08, '#8e44ad');
    k.wl(0.2, 1.2, 1.7, 0.1, h - 0.24, 5, 2, { lit: 0.8 }); k.wr(0.3, 1.6, 1.25, 0.1, h - 0.24, 6, 2, { lit: 0.8 });
    k.box(0.13, 0.18, 1.14, 1.54, h, 0.05, '#cfd6da');
    k.cyl(1.55, 0.6, 0.32, 0, 0.6, '#e3e7ea'); k.dome(1.55, 0.6, 0.32, 0.6, '#b9c3cb'); k.poly([[1.55, 0.6, 1.0], [1.7, 0.75, 0.75], [1.62, 0.83, 0.72]], '#3a3f45');
    k.ln([0.5, 0.6, h], [0.5, 0.6, h + 0.3], '#999', 1.2); k.cone(0.5, 0.6, 0.16, h + 0.42, -0.14, '#dfe5e9');
    k.cyl(1.55, 1.45, 0.16, 0, 0.4, '#8e44ad'); k.lamp(1.55, 1.45, 0.5, 0.2, '#c77dff');
  });

  // -------- PARK --------
  def('park', 1.1, function (k, l) {
    k.lot(1, '#86c75e'); k.poly([[0.02, 0.4, 0], [0.4, 0.02, 0], [0.55, 0.02, 0], [0.02, 0.55, 0]], '#e2d3a8');
    k.tree(0.28, 0.72, 0.8, 0); k.tree(0.72, 0.3, 0.75, 0); k.tree(0.78, 0.8, 0.6, 1);
    k.box(0.46, 0.5, 0.2, 0.06, 0, 0.06, '#8a5a34');
    if (l > 1) { k.disc(0.2, 0.25, 0.07, 0.01, '#e86a8a'); k.disc(0.52, 0.86, 0.06, 0.01, '#f2c94c'); }
    if (l > 2) { k.ln([0.5, 0.3, 0], [0.5, 0.3, 0.4], '#555', 1); k.lamp(0.5, 0.3, 0.42, 0.14); }
  });
  def('fountain', 1.1, function (k, l) {
    k.lot(1, '#d9d3c3'); k.cyl(0.5, 0.5, 0.36, 0, 0.1, '#bdb7a8', '#5fb4e6');
    k.cyl(0.5, 0.5, 0.08, 0.1, 0.22, '#cfc9ba'); k.cyl(0.5, 0.5, 0.17, 0.32, 0.04, '#cfc9ba', '#7cc6ee');
    k.ball(0.5, 0.5, 0.48, 0.05, '#e8f7ff'); k.ln([0.5, 0.5, 0.4], [0.5, 0.5, 0.6 + l * 0.05], '#d8f1ff', 1.6);
    k.lamp(0.5, 0.5, 0.2, 0.25, '#7cd6ff');
  });
  def('playground', 1.1, function (k) {
    k.lot(1, '#86c75e'); k.g(0.12, 0.12, 0.76, 0.76, '#ecd79a');
    k.ln([0.2, 0.3, 0], [0.26, 0.3, 0.45], '#e74c3c', 1.6); k.ln([0.5, 0.3, 0], [0.44, 0.3, 0.45], '#e74c3c', 1.6); k.ln([0.26, 0.3, 0.45], [0.44, 0.3, 0.45], '#e74c3c', 1.6);
    k.ln([0.32, 0.3, 0.45], [0.32, 0.3, 0.14], '#555', 0.7); k.ln([0.38, 0.3, 0.45], [0.38, 0.3, 0.14], '#555', 0.7);
    k.box(0.6, 0.55, 0.16, 0.16, 0, 0.36, '#3f8fd0'); k.poly([[0.6, 0.71, 0.34], [0.76, 0.71, 0.34], [0.76, 0.95, 0.02], [0.6, 0.95, 0.02]], '#f2c94c');
    k.hip(0.57, 0.52, 0.22, 0.22, 0.36, 0.14, '#e74c3c');
    k.cyl(0.26, 0.7, 0.11, 0, 0.05, '#2ecc71', '#58d68d'); k.tree(0.86, 0.16, 0.5, 0);
  });
  def('garden', 1.5, function (k, l) {
    k.lot(2, '#86c75e'); k.g(0.9, 0.04, 0.2, 1.92, '#e2d3a8'); k.g(0.04, 0.9, 1.92, 0.2, '#e2d3a8');
    var fl = ['#e86a8a', '#f2c94c', '#b06ad9', '#f08a4b'];
    for (var i = 0; i < 4; i++) { var u = i % 2 ? 1.45 : 0.45, v = i < 2 ? 0.45 : 1.45; k.disc(u, v, 0.3, 0.01, '#5fae4a'); k.disc(u, v, 0.2, 0.01, fl[i]); k.disc(u, v, 0.09, 0.01, '#fff3b0'); }
    k.cyl(1.0, 1.0, 0.2, 0, 0.06, '#d9d3c3'); for (i = 0; i < 4; i++) { var a = i * Math.PI / 2 + 0.78; k.ln([1 + Math.cos(a) * 0.16, 1 + Math.sin(a) * 0.16, 0.06], [1 + Math.cos(a) * 0.16, 1 + Math.sin(a) * 0.16, 0.4], '#fff', 1.2); }
    k.cone(1.0, 1.0, 0.26, 0.4, 0.22, '#3f8f6a');
    k.tree(0.14, 0.14, 0.7, 0); k.tree(1.86, 0.14, 0.7, 0); k.tree(0.14, 1.86, 0.7, 0); k.tree(1.86, 1.86, 0.7, 0);
    if (l > 1) { k.tree(0.14, 1.0, 0.55, 1); k.tree(1.86, 1.0, 0.55, 1); }
  });
  def('square', 1.9, function (k, l) {
    k.lot(2, '#d9d3c3');
    for (var j = 0; j < 6; j++) for (var i = 0; i < 6; i++) if ((i + j) % 2) k.g(0.1 + i * 0.3, 0.1 + j * 0.3, 0.3, 0.3, '#c5bda9');
    k.cyl(1.0, 1.0, 0.34, 0, 0.1, '#b9b2a2'); k.cyl(1.0, 1.0, 0.14, 0.1, 0.6, '#e9e4d6'); k.ball(1.0, 1.0, 0.86, 0.11, '#c9a24a');
    if (l > 1) k.flag(1.0, 1.0, 0.95, 0.5, '#e74c3c');
    [[0.2, 0.2], [1.8, 0.2], [0.2, 1.8], [1.8, 1.8]].forEach(function (q) { k.ln([q[0], q[1], 0], [q[0], q[1], 0.5], '#444', 1); k.lamp(q[0], q[1], 0.52, 0.2); });
    k.tree(1.0, 0.2, 0.6, 0); k.tree(0.2, 1.0, 0.6, 0);
    k.box(1.5, 1.72, 0.3, 0.07, 0, 0.07, '#8a5a34'); k.box(0.5, 1.72, 0.3, 0.07, 0, 0.07, '#8a5a34');
  });
  def('cinema', 2.2, function (k, l) {
    k.lot(2, PAVE);
    k.box(0.15, 0.15, 1.7, 1.45, 0, 1.2 + (l - 1) * 0.15, '#7a2f3f'); var h = 1.2 + (l - 1) * 0.15;
    k.rl(0.3, 1.7, 1.6, 0.5, 0.95, '#f6e7b0'); k.wl(0.34, 1.66, 1.6, 0.54, 0.92, 6, 1, { px: 0.1, pb: 0.1, pt: 0.1, col: '#e06a5a', lit: 1 });
    k.wl(0.3, 1.7, 1.6, 0.04, 0.4, 5, 1, { px: 0.06, pb: 0.05, pt: 0.05, lit: 1 });
    k.poly([[0.25, 1.6, 0.46], [1.75, 1.6, 0.46], [1.75, 1.85, 0.42], [0.25, 1.85, 0.42]], '#f2c94c');
    k.box(0.13, 0.13, 1.74, 1.49, h, 0.06, '#5a2230'); k.box(0.8, 1.45, 0.4, 0.08, h + 0.06, 0.4, '#f2c94c');
    for (var i = 0; i < 5; i++) k.lamp(0.4 + i * 0.3, 1.62, 1.02, 0.1, '#ffd34d');
  });
  def('museum', 2.6, function (k, l) {
    k.lot(2, PAVE);
    k.box(0.1, 0.1, 1.8, 1.8, 0, 0.1, '#d8d2c4'); k.box(0.16, 0.16, 1.68, 1.6, 0.1, 0.08, '#e0dacb');
    var h = 1.0 + (l - 1) * 0.15;
    k.box(0.24, 0.24, 1.52, 1.34, 0.18, h, '#efe8d8'); k.cols(0.3, 1.7, 1.58, 0.18, 0.18 + h, 7, '#fdfaf0'); k.rl(0.88, 1.12, 1.58, 0.18, 0.72, '#4a3a2a');
    k.wr(0.34, 1.5, 1.76, 0.4, 0.1 + h, 4, 1);
    k.gb(0.2, 1.1, 1.6, 0.52, 0.18 + h, 0.3, '#c9bfa6', 'u', '#efe8d8'); k.box(0.2, 0.2, 1.6, 0.9, 0.18 + h, 0.1, '#d9d0b9');
    k.dome(1.0, 0.7, 0.4, 0.28 + h, '#7fa7a0', 0.7);
    k.flag(0.3, 1.58, 0.18 + h, 0.5, '#8e44ad'); k.flag(1.7, 1.58, 0.18 + h, 0.5, '#8e44ad');
  });
  def('amusement', 4.2, function (k, l) {
    k.lot(3, '#93c96b'); k.g(0.2, 1.3, 2.6, 0.3, '#e2d3a8'); k.g(1.35, 0.2, 0.3, 2.6, '#e2d3a8');
    // dönme dolap (hareketli kısım render'da)
    k.ln([0.45, 0.75, 0], [0.75, 0.75, 1.9], '#e8e8e8', 2.4); k.ln([1.05, 0.75, 0], [0.75, 0.75, 1.9], '#e8e8e8', 2.4);
    k.cone(2.2, 0.7, 0.5, 0.3, 0.6, '#e74c3c'); k.cyl(2.2, 0.7, 0.42, 0, 0.3, '#f6e7b0'); k.cone(2.2, 0.7, 0.2, 0.75, 0.3, '#f2c94c'); k.flag(2.2, 0.7, 1.0, 0.3, '#3498db');
    k.cyl(0.75, 2.2, 0.42, 0, 0.1, '#d9c9a8'); for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3; k.ln([0.75 + Math.cos(a) * 0.32, 2.2 + Math.sin(a) * 0.32, 0.1], [0.75 + Math.cos(a) * 0.32, 2.2 + Math.sin(a) * 0.32, 0.5], ['#e74c3c', '#f2c94c', '#3498db'][i % 3], 1.6); }
    k.cone(0.75, 2.2, 0.48, 0.5, 0.36, '#9b59b6'); k.ball(0.75, 2.2, 0.9, 0.05, '#f2c94c');
    k.box(1.9, 1.9, 0.8, 0.7, 0, 0.5, '#3fa7c9'); k.hip(1.85, 1.85, 0.9, 0.8, 0.5, 0.4, '#f08a4b'); k.rl(2.1, 2.5, 2.6, 0, 0.34, '#f6e7b0');
    if (l > 1) { k.cone(2.75, 1.45, 0.16, 0, 0.5, '#e74c3c'); k.cone(1.5, 2.75, 0.16, 0, 0.5, '#3498db'); }
    k.tree(0.2, 0.2, 0.6, 0); k.tree(2.8, 2.8, 0.6, 0);
    for (i = 0; i < 4; i++) k.lamp(0.4 + i * 0.75, 1.45, 0.3, 0.2, ['#ff6a8a', '#ffd34d', '#6ad1ff', '#9dff8a'][i]);
  }, { anim: { t: 'wheel', u: 0.75, v: 0.75, z: 1.9, r: 1.45 } });
  def('stadium', 3.4, function (k, l) {
    k.lot(4, ASPH);
    k.cyl(2, 2, 1.85, 0, 1.0 + (l - 1) * 0.15, '#d5d9de', '#c0c5cc'); var h = 1.0 + (l - 1) * 0.15;
    k.disc(2, 2, 1.62, h - 0.05, '#c0392b'); k.disc(2, 2, 1.42, h - 0.25, '#2f6fb5'); k.disc(2, 2, 1.22, h - 0.45, '#e8e8e8');
    k.disc(2, 2, 1.05, h - 0.6, '#3f9d4b'); k.disc(2, 2, 0.3, h - 0.6, 'rgba(255,255,255,0)', '#e9f5e9');
    k.ln([1.26, 2.74, h - 0.6], [2.74, 1.26, h - 0.6], '#e9f5e9', 0.9);
    [[0.75, 0.75], [3.25, 0.75], [0.75, 3.25], [3.25, 3.25]].forEach(function (q) { k.ln([q[0], q[1], 0], [q[0], q[1], h + 1.3], '#8a9099', 2); k.box(q[0] - 0.12, q[1] - 0.05, 0.24, 0.1, h + 1.2, 0.2, '#f4f4f4'); k.lamp(q[0], q[1], h + 1.3, 0.45, '#fff7d6'); });
    k.rl(1.7, 2.3, 3.85, 0, 0.4, '#3a3f45');
  });

  // -------- ÖZEL --------
  def('townhall', 5, function (k, l) {
    var tier = l < 3 ? 0 : l < 6 ? 1 : 2;
    k.lot(2, PAVE);
    if (tier === 0) {
      k.g(0.1, 1.5, 1.8, 0.4, GRASS);
      k.box(0.25, 0.3, 1.5, 1.05, 0, 0.8, '#f1e3c6'); k.wl(0.3, 0.85, 1.35, 0.15, 0.7, 2, 1); k.wl(1.15, 1.7, 1.35, 0.15, 0.7, 2, 1); k.rl(0.9, 1.1, 1.35, 0, 0.45, '#6e4930'); k.wr(0.38, 1.28, 1.75, 0.15, 0.7, 3, 1);
      k.gb(0.2, 0.25, 1.6, 1.15, 0.8, 0.45, '#b5533c', 'u', '#f1e3c6');
      k.box(0.85, 0.7, 0.3, 0.3, 0.8, 0.75, '#f1e3c6'); k.clock(1.0, 1.0, 1.28, 0.1); k.hip(0.81, 0.66, 0.38, 0.38, 1.55, 0.3, '#b5533c');
      k.flag(1.0, 0.85, 1.85, 0.45, '#e74c3c'); k.tree(0.25, 1.75, 0.6, 0); k.tree(1.75, 1.75, 0.6, 0);
    } else if (tier === 1) {
      k.box(0.1, 0.1, 1.8, 1.8, 0, 0.12, '#d8d2c4');
      k.box(0.2, 0.25, 1.6, 1.25, 0.12, 1.2, '#efe6d2'); k.cols(0.26, 1.74, 1.5, 0.12, 1.32, 7, '#fdf9ee'); k.rl(0.88, 1.12, 1.5, 0.12, 0.7, '#5a4632'); k.wr(0.35, 1.4, 1.8, 0.3, 1.2, 4, 2);
      k.gb(0.16, 0.21, 1.68, 1.33, 1.32, 0.4, '#4f6d8a', 'v', '#efe6d2');
      k.box(0.8, 0.65, 0.4, 0.4, 1.4, 1.1, '#efe6d2'); k.clock(1.0, 1.05, 2.15, 0.13); k.wr(0.7, 1.0, 1.2, 1.6, 2.0, 1, 1); k.hip(0.75, 0.6, 0.5, 0.5, 2.5, 0.45, '#4f6d8a');
      k.flag(1.0, 0.85, 2.95, 0.5, '#e74c3c');
    } else {
      k.box(0.06, 0.06, 1.88, 1.88, 0, 0.14, '#d8d2c4'); k.box(0.14, 0.14, 1.72, 1.6, 0.14, 0.1, '#e3ddd0');
      k.box(0.2, 0.2, 1.6, 1.4, 0.24, 1.6, '#f4eedf'); k.cols(0.26, 1.74, 1.6, 0.24, 1.84, 8, '#fffdf5'); k.rl(0.86, 1.14, 1.6, 0.24, 0.9, '#4a3a2a');
      k.wr(0.3, 1.5, 1.8, 0.4, 1.75, 5, 3); k.box(0.16, 0.16, 1.68, 1.48, 1.84, 0.12, '#e0d6bd');
      k.cyl(1.0, 0.9, 0.5, 1.96, 0.5, '#f4eedf'); k.dome(1.0, 0.9, 0.5, 2.46, '#d4a93a');
      k.cyl(1.0, 0.9, 0.1, 2.95, 0.3, '#f4eedf'); k.ball(1.0, 0.9, 3.32, 0.06, '#f2c94c');
      k.flag(0.3, 1.5, 1.96, 0.6, '#e74c3c'); k.flag(1.7, 1.5, 1.96, 0.6, '#e74c3c');
      k.lamp(1.0, 0.9, 2.7, 0.5, '#ffe9a8');
    }
  });
  def('depot', 1.2, function (k, l) {
    k.lot(1, '#c2b79f');
    k.box(0.14, 0.14, 0.62, 0.62, 0, 0.42 + (l - 1) * 0.1, '#b08a5a'); var h = 0.42 + (l - 1) * 0.1;
    k.rl(0.26, 0.64, 0.76, 0, 0.32, '#7a5a38'); k.ln([0.45, 0.76, 0], [0.45, 0.76, 0.32], '#5a4028', 0.8);
    k.gb(0.1, 0.1, 0.7, 0.7, h, 0.22, '#7d8791', 'v', '#b08a5a');
    k.box(0.8, 0.5, 0.14, 0.14, 0, 0.14, '#c9a063'); k.box(0.8, 0.68, 0.14, 0.14, 0, 0.14, '#b98f52'); k.box(0.82, 0.58, 0.12, 0.12, 0.14, 0.12, '#d1aa6e');
  });
  def('bazaar', 1.4, function (k) {
    k.lot(2, '#d9cdb0');
    var cs = ['#e74c3c', '#3498db', '#f2c94c', '#2ecc71', '#9b59b6'];
    [[0.2, 0.2], [1.2, 0.2], [0.2, 1.2], [1.2, 1.2], [0.7, 0.7]].forEach(function (q, i) {
      k.box(q[0] + 0.06, q[1] + 0.06, 0.48, 0.48, 0, 0.14, '#b98f5f');
      k.ln([q[0], q[1] + 0.6, 0], [q[0], q[1] + 0.6, 0.45], '#7a5a38', 1); k.ln([q[0] + 0.6, q[1] + 0.6, 0], [q[0] + 0.6, q[1] + 0.6, 0.45], '#7a5a38', 1); k.ln([q[0] + 0.6, q[1], 0], [q[0] + 0.6, q[1], 0.45], '#7a5a38', 1);
      k.hip(q[0] - 0.03, q[1] - 0.03, 0.66, 0.66, 0.45, 0.26, cs[i]);
      k.lamp(q[0] + 0.3, q[1] + 0.6, 0.36, 0.14);
    });
  });
  def('builder', 2.8, function (k) {
    k.lot(2, '#b7a88a');
    k.box(0.15, 0.2, 0.8, 0.5, 0, 0.36, '#f2c94c'); k.wl(0.2, 0.9, 0.7, 0.08, 0.3, 3, 1); k.box(0.2, 0.25, 0.8, 0.5, 0.36, 0.36, '#3f8fbf'); k.wl(0.25, 0.95, 0.75, 0.44, 0.66, 3, 1);
    k.ln([1.55, 0.5, 0], [1.55, 0.5, 2.3], '#e0b23a', 2.6); k.ln([1.0, 1.05, 2.2], [1.85, 0.2, 2.2], '#e0b23a', 2); k.ln([1.55, 0.5, 2.5], [1.0, 1.05, 2.2], '#555', 0.7); k.ln([1.55, 0.5, 2.5], [1.85, 0.2, 2.2], '#555', 0.7); k.ln([1.55, 0.5, 2.3], [1.55, 0.5, 2.5], '#e0b23a', 2);
    k.ln([1.1, 0.95, 2.2], [1.1, 0.95, 1.2], '#333', 0.7); k.box(1.02, 0.87, 0.16, 0.16, 1.1, 0.1, '#888'); k.box(1.72, 0.1, 0.2, 0.2, 2.0, 0.2, '#777');
    k.cone(0.5, 1.5, 0.3, 0, 0.3, '#d9c08a'); k.box(1.1, 1.5, 0.5, 0.25, 0, 0.12, '#b55a3c'); k.box(1.15, 1.5, 0.4, 0.25, 0.12, 0.12, '#b55a3c');
    for (var i = 0; i < 3; i++) k.box(1.3 + i * 0.03, 1.2 + i * 0.08, 0.5, 0.06, 0, 0.06, '#9aa0a6');
  });
  def('warehouse', 1.8, function (k, l) {
    k.lot(2, '#a8a59d');
    var h = 0.8 + (l - 1) * 0.15;
    k.box(0.15, 0.2, 1.7, 1.3, 0, h, '#aeb9c2');
    for (var i = 0; i < 3; i++) k.rl(0.25 + i * 0.55, 0.65 + i * 0.55, 1.5, 0, 0.45, '#5f6c78');
    k.rl(0.15, 1.85, 1.5, h - 0.14, h - 0.04, '#e67e22'); k.wr(0.3, 1.4, 1.85, 0.4, h - 0.1, 4, 1);
    k.gb(0.12, 0.17, 1.76, 1.36, h, 0.3, '#7d8791', 'v', '#aeb9c2');
    k.box(0.3, 1.66, 0.2, 0.2, 0, 0.2, '#c9a063'); k.box(0.56, 1.68, 0.18, 0.18, 0, 0.18, '#b98f52'); k.box(1.3, 1.65, 0.4, 0.2, 0, 0.14, '#3f8fbf');
  });
  def('port', 3.6, function (k, l) {
    k.lot(3, '#b9b7b0'); k.g(0.02, 2.45, 2.96, 0.5, '#9d9a92');
    k.box(0.2, 0.2, 1.3, 1.0, 0, 0.8, '#b0bcc6'); k.rl(0.4, 0.8, 1.2, 0, 0.5, '#5f6c78'); k.rl(0.9, 1.3, 1.2, 0, 0.5, '#5f6c78'); k.gb(0.17, 0.17, 1.36, 1.06, 0.8, 0.3, '#6b7884', 'v', '#b0bcc6');
    var cs = ['#c0392b', '#2e86c1', '#27ae60', '#e67e22', '#8e44ad', '#f1c40f'];
    for (var i = 0; i < 6; i++) { var cu = 1.75 + (i % 2) * 0.55, cv = 0.25 + ((i / 2) | 0) * 0.4; k.box(cu, cv, 0.5, 0.26, 0, 0.22, cs[i]); if (i % 3 !== 1 || l > 1) k.box(cu, cv, 0.5, 0.26, 0.22, 0.22, cs[(i + 2) % 6]); }
    k.box(0.3, 1.6, 0.5, 0.26, 0, 0.22, cs[3]); k.box(0.9, 1.6, 0.5, 0.26, 0, 0.22, cs[1]);
    // vinç
    k.ln([1.7, 2.1, 0], [1.7, 2.1, 2.0], '#e67e22', 2.6); k.ln([2.5, 2.1, 0], [2.5, 2.1, 2.0], '#e67e22', 2.6); k.ln([1.7, 2.75, 0], [1.7, 2.75, 2.0], '#e67e22', 2.6); k.ln([2.5, 2.75, 0], [2.5, 2.75, 2.0], '#e67e22', 2.6);
    k.box(1.65, 2.05, 0.9, 0.75, 2.0, 0.16, '#d35400'); k.ln([2.1, 1.2, 2.3], [2.1, 3.0, 2.3], '#d35400', 2.6); k.ln([2.1, 2.4, 2.16], [2.1, 2.4, 3.0], '#d35400', 2); k.ln([2.1, 2.4, 3.0], [2.1, 1.2, 2.3], '#555', 0.8); k.ln([2.1, 2.4, 3.0], [2.1, 3.0, 2.3], '#555', 0.8);
    k.ln([2.1, 2.9, 2.3], [2.1, 2.9, 1.1], '#333', 0.8); k.box(1.9, 2.78, 0.4, 0.22, 0.9, 0.2, cs[0]);
    k.lamp(2.1, 2.4, 3.0, 0.14, '#ff5a4a');
  });
  def('airport', 3.6, function (k, l) {
    k.lot(4, '#9bbf73'); k.g(0.05, 2.5, 3.9, 1.1, '#5f646b'); k.g(0.05, 2.5, 3.9, 0.04, '#eee'); k.g(0.05, 3.56, 3.9, 0.04, '#eee');
    for (var i = 0; i < 7; i++) k.g(0.3 + i * 0.52, 3.03, 0.3, 0.05, '#f4f4f4');
    k.g(0.2, 1.5, 3.4, 0.9, '#8a8f96');
    k.box(0.3, 0.4, 2.5, 0.95, 0, 0.7, '#e9eef2'); k.wl(0.35, 2.75, 1.35, 0.08, 0.62, 10, 1, { px: 0.05, pb: 0.06, pt: 0.06, col: '#8fcbe8', lit: 0.9 }); k.wr(0.45, 1.3, 2.8, 0.08, 0.62, 3, 1, { px: 0.05, pb: 0.06, pt: 0.06, col: '#8fcbe8' });
    k.poly([[0.3, 0.4, 0.7], [2.8, 0.4, 0.7], [2.8, 1.35, 0.7], [0.3, 1.35, 0.7]], '#cfd8de'); k.gb(0.3, 0.4, 2.5, 0.95, 0.7, 0.24, '#b9c6cf', 'u', '#e9eef2');
    k.cyl(3.35, 0.7, 0.14, 0, 2.2 + (l - 1) * 0.3, '#e3e7ea'); var th = 2.2 + (l - 1) * 0.3; k.cyl(3.35, 0.7, 0.26, th, 0.26, '#3f6f96', '#dfe6ea'); k.lamp(3.35, 0.7, th + 0.5, 0.14, '#ff5a4a'); k.ln([3.35, 0.7, th + 0.26], [3.35, 0.7, th + 0.5], '#ccc', 1);
    // uçak
    k.box(1.0, 1.82, 1.3, 0.2, 0.14, 0.18, '#f8f8f8'); k.poly([[1.5, 1.4, 0.24], [1.85, 1.4, 0.24], [1.8, 2.45, 0.24], [1.6, 2.45, 0.24]], '#e3e7ea'); k.poly([[1.0, 1.92, 0.3], [1.22, 1.92, 0.3], [1.02, 1.92, 0.62]], '#2e86c1'); k.rl(1.3, 2.2, 2.02, 0.2, 0.27, '#2e86c1');
    k.lamp(0.2, 2.5, 0.05, 0.12, '#6ad1ff'); k.lamp(3.9, 2.5, 0.05, 0.12, '#6ad1ff'); k.lamp(0.2, 3.6, 0.05, 0.12, '#6ad1ff'); k.lamp(3.9, 3.6, 0.05, 0.12, '#6ad1ff');
  });

  // -------- ANITLAR --------
  def('clocktower', 4.6, function (k, l) {
    k.lot(1, PAVE); k.box(0.16, 0.16, 0.68, 0.68, 0, 0.14, '#cfc8b8');
    var h = 2.6 + (l - 1) * 0.4;
    k.box(0.28, 0.28, 0.44, 0.44, 0.14, h, '#e3d6bb'); k.wl(0.36, 0.64, 0.72, 0.4, h * 0.7, 1, 3); k.wr(0.36, 0.64, 0.72, 0.4, h * 0.7, 1, 3); k.rl(0.42, 0.58, 0.72, 0.14, 0.44, '#5a4632');
    k.box(0.22, 0.22, 0.56, 0.56, 0.14 + h, 0.6, '#efe4cc'); k.clock(0.5, 0.78, 0.44 + h, 0.19);
    k.hip(0.18, 0.18, 0.64, 0.64, 0.74 + h, 0.6, '#3f6f7a'); k.ball(0.5, 0.5, 1.4 + h, 0.04, '#f2c94c');
    k.lamp(0.5, 0.8, 0.44 + h, 0.3, '#fff3c4');
  });
  def('lighthouse', 4.4, function (k, l) {
    k.lot(1, '#c9c2b0'); k.cyl(0.5, 0.5, 0.36, 0, 0.14, '#b5ad9a');
    var h = 2.4 + (l - 1) * 0.35, seg = h / 4;
    for (var i = 0; i < 4; i++) k.taper(0.5, 0.5, 0.26 - i * 0.03, 0.23 - i * 0.03, 0.14 + i * seg, seg, i % 2 ? '#d9463a' : '#f6f3ea');
    k.cyl(0.5, 0.5, 0.22, 0.14 + h, 0.06, '#555'); k.cyl(0.5, 0.5, 0.13, 0.2 + h, 0.3, '#ffe9a0'); k.cone(0.5, 0.5, 0.18, 0.5 + h, 0.24, '#b03a2e');
    k.lamp(0.5, 0.5, 0.36 + h, 0.7, '#fff2a8');
  });
  def('grandlibrary', 4, function (k, l) {
    k.lot(3, PAVE); k.box(0.1, 0.1, 2.8, 2.8, 0, 0.14, '#d8d2c4'); k.box(0.3, 2.3, 2.4, 0.5, 0.14, 0.06, '#e3ddd0');
    var h = 1.5 + (l - 1) * 0.2;
    k.box(0.25, 0.25, 2.5, 2.05, 0.14, h, '#efe6d2'); k.cols(0.32, 2.68, 2.3, 0.14, 0.14 + h, 11, '#fffbee'); k.rl(1.3, 1.7, 2.3, 0.14, 0.9, '#4a3a2a');
    k.wr(0.4, 2.2, 2.75, 0.4, h, 6, 2); k.box(0.2, 0.2, 2.6, 2.15, 0.14 + h, 0.14, '#ddd2b8');
    k.gb(0.9, 1.6, 1.2, 0.75, 0.28 + h, 0.4, '#cbbd9c', 'u', '#efe6d2');
    k.cyl(1.5, 1.1, 0.7, 0.28 + h, 0.4, '#efe6d2'); k.dome(1.5, 1.1, 0.7, 0.68 + h, '#3f8f8a'); k.cyl(1.5, 1.1, 0.1, 1.3 + h, 0.2, '#efe6d2'); k.ball(1.5, 1.1, 1.56 + h, 0.05, '#f2c94c');
    k.lamp(1.5, 2.32, 0.6, 0.4, '#ffe9a8');
  });
  def('opera', 3.6, function (k, l) {
    k.lot(3, '#cfd6da'); k.box(0.12, 0.12, 2.76, 2.76, 0, 0.2, '#e6e9eb');
    var c = '#fbfbf7', e = (l - 1) * 0.15;
    function sail(u, v, r, h) { k.poly([[u - r, v, 0.2], [u, v - r * 0.5, 0.2], [u + r * 0.2, v, 0.2 + h]], shade(c, 0.86)); k.poly([[u - r, v, 0.2], [u, v + r * 0.6, 0.2], [u + r * 0.2, v, 0.2 + h]], c); k.poly([[u, v + r * 0.6, 0.2], [u + r * 0.7, v, 0.2], [u + r * 0.2, v, 0.2 + h]], shade(c, 0.72)); }
    sail(0.9, 0.8, 0.7, 1.5 + e); sail(1.5, 0.9, 0.8, 2.1 + e); sail(2.1, 1.0, 0.75, 2.6 + e);
    sail(1.0, 1.9, 0.6, 1.2 + e); sail(1.6, 2.0, 0.7, 1.7 + e); sail(2.2, 2.1, 0.6, 2.1 + e);
    k.wl(0.3, 2.7, 2.88, 0.02, 0.18, 12, 1, { px: 0.1, pb: 0.1, pt: 0.1, lit: 1 });
    k.lamp(1.5, 1.5, 0.5, 0.9, '#ffe9c8');
  });
  def('tvtower', 12, function (k, l) {
    k.lot(2, PAVE); k.cyl(1, 1, 0.6, 0, 0.3, '#d5d9dd'); k.cyl(1, 1, 0.42, 0.3, 0.2, '#c0c6cc');
    var h = 6.4 + (l - 1) * 0.6;
    k.taper(1, 1, 0.22, 0.1, 0.5, h, '#e6e9ec');
    k.taper(1, 1, 0.1, 0.42, 0.5 + h, 0.3, '#b9c2ca'); k.cyl(1, 1, 0.42, 0.8 + h, 0.3, '#4f8fb5'); k.taper(1, 1, 0.42, 0.2, 1.1 + h, 0.25, '#dfe5ea');
    k.wl(0.72, 1.28, 1.3, 0.84 + h, 1.06 + h, 5, 1, { px: 0.1, pb: 0.1, pt: 0.1, lit: 1, col: '#bfe6f7' });
    k.taper(1, 1, 0.07, 0.02, 1.35 + h, 2.4, '#f0f0f0'); k.cyl(1, 1, 0.05, 2.2 + h, 0.3, '#d9463a');
    k.lamp(1, 1, 3.75 + h, 0.16, '#ff5a4a'); k.lamp(1, 1, 0.95 + h, 0.5, '#8fdcff');
  });
  def('monument', 5.4, function (k, l) {
    k.lot(2, '#d9d3c3'); k.box(0.15, 0.15, 1.7, 1.7, 0, 0.16, '#cfc8b8'); k.box(0.4, 0.4, 1.2, 1.2, 0.16, 0.16, '#d9d2c2'); k.box(0.65, 0.65, 0.7, 0.7, 0.32, 0.5, '#e6dfcf');
    var h = 3.0 + (l - 1) * 0.5;
    var z0 = 0.82, a = 0.2, b = 0.11;
    k.poly([[1 - a, 1 + a, z0], [1 + a, 1 + a, z0], [1 + b, 1 + b, z0 + h], [1 - b, 1 + b, z0 + h]], '#f2ecdf');
    k.poly([[1 + a, 1 - a, z0], [1 + a, 1 + a, z0], [1 + b, 1 + b, z0 + h], [1 + b, 1 - b, z0 + h]], '#cfc8b8');
    k.hip(1 - b, 1 - b, b * 2, b * 2, z0 + h, 0.3, '#e0b23a');
    k.flag(0.3, 1.7, 0.16, 0.9, '#e74c3c'); k.flag(1.7, 1.7, 0.16, 0.9, '#e74c3c'); k.flag(1.7, 0.3, 0.16, 0.9, '#e74c3c');
    k.lamp(1, 1, z0 + h + 0.2, 0.3, '#ffe08a'); k.lamp(1, 1.36, 0.5, 0.5, '#ffe9c8');
  });
  def('spaceport', 6.6, function (k, l) {
    k.lot(4, '#aeb3b0'); k.disc(2.6, 2.6, 1.1, 0.01, '#8d9296'); k.disc(2.6, 2.6, 0.9, 0.01, '#777c80', '#e0b23a');
    // hangar
    k.box(0.25, 0.25, 1.7, 1.2, 0, 1.0, '#dfe4e8'); k.rl(0.5, 1.7, 1.45, 0, 0.75, '#6f7b86'); k.wr(0.4, 1.3, 1.95, 0.3, 0.9, 3, 1);
    k.gb(0.22, 0.22, 1.76, 1.26, 1.0, 0.36, '#9aa7b2', 'v', '#dfe4e8'); k.rl(0.25, 1.95, 1.45, 0.82, 0.96, '#2e86c1');
    // çanak
    k.cyl(3.3, 0.6, 0.12, 0, 0.5, '#c9d0d6'); k.cone(3.3, 0.6, 0.4, 0.95, -0.4, '#e9eef2'); k.ln([3.3, 0.6, 0.6], [3.3, 0.6, 1.2], '#888', 1);
    // kule
    k.ln([1.9, 2.9, 0], [1.9, 2.9, 4.4], '#c0392b', 2.6); k.ln([2.2, 3.2, 0], [2.2, 3.2, 4.4], '#c0392b', 2.6);
    for (var i = 0; i < 8; i++) k.ln([1.9, 2.9, 0.5 + i * 0.5], [2.2, 3.2, 0.25 + i * 0.5], '#d9463a', 1);
    k.ln([2.05, 3.05, 3.4], [2.5, 2.7, 3.4], '#c0392b', 1.8);
    // roket
    var rh = 3.6 + (l - 1) * 0.3;
    k.cyl(2.32, 2.45, 0.12, 0.1, 1.5, '#e8e8e8'); k.cone(2.32, 2.45, 0.12, 1.6, 0.4, '#d9463a');
    k.cyl(2.88, 2.75, 0.12, 0.1, 1.5, '#e8e8e8'); k.cone(2.88, 2.75, 0.12, 1.6, 0.4, '#d9463a');
    k.cyl(2.6, 2.6, 0.2, 0.1, rh, '#fafafa'); k.cyl(2.6, 2.6, 0.205, 1.6, 0.2, '#2e86c1'); k.cyl(2.6, 2.6, 0.205, rh - 0.5, 0.14, '#333');
    k.cone(2.6, 2.6, 0.2, 0.1 + rh, 0.7, '#d9463a');
    k.lamp(2.6, 2.6, 0.2, 0.6, '#ffb057'); k.lamp(2.2, 3.2, 4.4, 0.14, '#ff5a4a');
  });

  /* ===================== SPRITE ÜRETİMİ ===================== */
  var cache = {};
  function makeCanvas(w, h) {
    var c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c;
  }
  art.variantOf = function (b) { return (CB.hash2(b.x, b.y, 91) * 4) | 0; };
  function artKey(id, l) { return id === 'townhall' ? (l < 3 ? 1 : l < 6 ? 3 : 6) : l; }

  /* gündüz/gece sprite'ı */
  art.sprite = function (id, l, vr, night) {
    l = artKey(id, l || 1); vr = vr || 0;
    var key = id + '|' + l + '|' + vr + (night ? '|n' : '');
    if (cache[key]) return cache[key];
    var d = A[id], n = CB.D.B[id].size, s = n >= 3 ? 1.5 : 2;
    var W = n * TW * s + 12, H = n * TH * s + d.hz * ZH * s + 10;
    var sp;
    if (!night) {
      var c = makeCanvas(W, H), ctx = c.getContext('2d');
      var k = new Kit(ctx, s, W / 2, d.hz * ZH * s + 4, false, 11 + vr);
      d.draw(k, l, vr);
      sp = { c: c, ox: W / 2, oy: d.hz * ZH * s + 4, s: s, w: c.width, h: c.height };
    } else {
      var day = art.sprite(id, l, vr, false);
      var c2 = makeCanvas(day.w, day.h), x = c2.getContext('2d');
      x.drawImage(day.c, 0, 0);
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(14,22,62,0.6)'; x.fillRect(0, 0, c2.width, c2.height);
      x.globalCompositeOperation = 'source-over';
      var k2 = new Kit(x, s, day.ox, day.oy, true, 23 + vr * 7 + l);
      d.draw(k2, l, vr);
      sp = { c: c2, ox: day.ox, oy: day.oy, s: s, w: c2.width, h: c2.height };
    }
    cache[key] = sp;
    return sp;
  };

  var thumbs = {};
  art.thumb = function (id) {
    if (thumbs[id]) return thumbs[id];
    var c;
    if (A[id]) { c = art.sprite(id, 1, 0, false).c; }
    else {
      c = makeCanvas(128, 96); var ctx = c.getContext('2d'), k = new Kit(ctx, 2, 64, 24, false, 3);
      if (id === 'road') { drawRoad(k, 5, false); }
      else if (id === 'bridge') { k.g(0, 0, 1, 1, WATER); drawRoad(k, 5, true); }
      else if (id === 'tree') { k.g(0, 0, 1, 1, GRASS); k.tree(0.5, 0.5, 1.1, 0); }
      else if (id === 'bulldoze') {
        k.g(0, 0, 1, 1, DIRT); k.box(0.3, 0.35, 0.4, 0.3, 0.06, 0.2, '#f1c40f'); k.box(0.36, 0.38, 0.2, 0.22, 0.26, 0.16, '#f39c12');
        k.box(0.26, 0.33, 0.48, 0.08, 0, 0.08, '#333'); k.box(0.26, 0.6, 0.48, 0.08, 0, 0.08, '#333'); k.box(0.74, 0.28, 0.05, 0.46, 0, 0.2, '#bbb');
      }
    }
    return (thumbs[id] = c.toDataURL());
  };

  /* yol karoları: maske bit 1=x-1, 2=x+1, 4=y-1, 8=y+1 */
  function drawRoad(k, mask, bridge) {
    var a = 0.22, b = 0.78, R = '#5f646b', SW = bridge ? '#b9b3a6' : '#bdb9ae', LN = '#f2d85c';
    if (bridge) { k.g(-0.02, -0.02, 1.04, 1.04, '#8a8478', -0.12); k.box(0.3, 0.3, 0.4, 0.4, -0.5, 0.38, '#8f897c'); }
    k.g(-0.01, -0.01, 1.02, 1.02, SW);
    k.g(a, a, b - a, b - a, R);
    if (mask & 1) k.g(-0.01, a, a + 0.02, b - a, R);
    if (mask & 2) k.g(b - 0.01, a, 1 - b + 0.02, b - a, R);
    if (mask & 4) k.g(a, -0.01, b - a, a + 0.02, R);
    if (mask & 8) k.g(a, b - 0.01, b - a, 1 - b + 0.02, R);
    var h = (mask & 3), v = (mask & 12);
    if (h && !v) { k.g(0.08, 0.485, 0.24, 0.03, LN); k.g(0.5, 0.485, 0.24, 0.03, LN); if (h !== 3) k.g((mask & 1) ? 0.74 : 0.2, a, 0.04, b - a, R); }
    else if (v && !h) { k.g(0.485, 0.08, 0.03, 0.24, LN); k.g(0.485, 0.5, 0.03, 0.24, LN); }
    if (bridge) { k.ln([0, 0, 0.1], [1, 0, 0.1], '#ddd', 1); k.ln([0, 1, 0.1], [1, 1, 0.1], '#ddd', 1); k.ln([0, 0, 0.1], [0, 1, 0.1], '#ddd', 1); k.ln([1, 0, 0.1], [1, 1, 0.1], '#ddd', 1); }
  }
  var roadCache = {};
  art.road = function (mask, bridge) {
    var key = mask + (bridge ? 'b' : '');
    if (roadCache[key]) return roadCache[key];
    var s = 2, W = TW * s + 8, H = TH * s + 8 + (bridge ? 22 * s : 0);
    var c = makeCanvas(W, H), k = new Kit(c.getContext('2d'), s, W / 2, 4 + (bridge ? 4 * s : 0), false, 1);
    // köprüde korkuluk seçici: sadece yol yönüne göre çiz
    drawRoad(k, mask, bridge);
    return (roadCache[key] = { c: c, ox: W / 2, oy: 4 + (bridge ? 4 * s : 0), s: s, w: W, h: H });
  };

  /* zemin karoları */
  var groundCache = {};
  art.ground = function (type, variant) {
    var key = type + '|' + variant;
    if (groundCache[key]) return groundCache[key];
    var s = 2, W = TW * s + 4, H = TH * s + 4, c = makeCanvas(W, H), ctx = c.getContext('2d');
    var k = new Kit(ctx, s, W / 2, 2, false, 100 + type * 13 + variant);
    var base;
    if (type === 2) base = ['#3f96d2', '#4aa0d9', '#4499d4', '#3d92cd'][variant];
    else if (type === 3) base = ['#e6d7a3', '#e1d199', '#eadcab', '#e4d49e'][variant];
    else if (type === 4) base = ['#a9a393', '#a39d8e', '#aea897', '#a6a090'][variant];
    else if (type === 5) base = ['#8f8478', '#897e73', '#93887b', '#8c8175'][variant];
    else if (type === 1) base = ['#6aa84c', '#66a449', '#6eab50', '#69a64b'][variant];
    else base = ['#7fbd5a', '#7ab856', '#84c05e', '#7dba58'][variant];
    k.poly([[-0.02, -0.02, 0], [1.02, -0.02, 0], [1.02, 1.02, 0], [-0.02, 1.02, 0]], base);
    // doku
    ctx.save(); ctx.beginPath();
    var p0 = k.p(0, 0), p1 = k.p(1, 0), p2 = k.p(1, 1), p3 = k.p(0, 1);
    ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.closePath(); ctx.clip();
    for (var i = 0; i < 14; i++) {
      var q = k.p(k.rnd(), k.rnd());
      ctx.fillStyle = type === 2 ? 'rgba(255,255,255,' + (0.05 + k.rnd() * 0.1) + ')' : (k.rnd() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)');
      if (type === 2) ctx.fillRect(q[0] - 6 * s * k.rnd(), q[1], 9 * s, 1.2 * s);
      else { ctx.beginPath(); ctx.ellipse(q[0], q[1], (2 + k.rnd() * 4) * s, (1 + k.rnd() * 2) * s, 0, 0, 6.3); ctx.fill(); }
    }
    ctx.restore();
    return (groundCache[key] = { c: c, ox: W / 2, oy: 2, s: s, w: W, h: H });
  };

  /* doğa nesneleri: ağaç, kaya, cevher */
  var natCache = {};
  art.nature = function (type, variant, night) {
    var key = type + '|' + variant + (night ? 'n' : '');
    if (natCache[key]) return natCache[key];
    var s = 2, W = TW * s + 8, H = TH * s + 1.4 * ZH * s + 8;
    var c = makeCanvas(W, H), ctx = c.getContext('2d'), oy = 1.4 * ZH * s + 4;
    if (night) {
      var day = art.nature(type, variant, false);
      ctx.drawImage(day.c, 0, 0); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(14,22,62,0.6)'; ctx.fillRect(0, 0, W, H);
    } else {
      var k = new Kit(ctx, s, W / 2, oy, false, 300 + type * 31 + variant * 7);
      if (type === 1) {
        var n = 2 + (variant % 2), kind = variant >= 2 ? 1 : 0;
        var pos = [[0.3, 0.32], [0.7, 0.45], [0.38, 0.76], [0.74, 0.8]];
        for (var i = 0; i < n + 1; i++) k.tree(pos[i][0] + (k.rnd() - 0.5) * 0.1, pos[i][1] + (k.rnd() - 0.5) * 0.1, 0.75 + k.rnd() * 0.35, (kind + (i === 2 ? 1 : 0)) % 2);
      } else {
        var cols = type === 4 ? ['#9a9486', '#8b8578', '#a7a193'] : ['#5b5560', '#4d4852', '#6a6470'];
        for (var j = 0; j < 3; j++) {
          var u = 0.25 + k.rnd() * 0.45, v = 0.25 + k.rnd() * 0.45, r = 0.14 + k.rnd() * 0.12, h = 0.14 + k.rnd() * 0.22, cc = cols[j];
          k.poly([[u - r, v + r * 0.6, 0], [u, v + r, 0], [u + r, v + r * 0.2, 0], [u + r * 0.3, v, h], [u - r * 0.5, v + r * 0.2, h * 0.8]], cc);
          k.poly([[u, v + r, 0], [u + r, v + r * 0.2, 0], [u + r * 0.3, v, h]], shade(cc, 0.75));
          k.poly([[u - r, v + r * 0.6, 0], [u - r * 0.5, v + r * 0.2, h * 0.8], [u + r * 0.3, v, h], [u - r * 0.2, v - r * 0.3, 0]], shade(cc, 1.18));
          if (type === 5) { k.disc(u, v + r * 0.5, 0.03, h * 0.4, '#e0a84a'); k.disc(u + r * 0.4, v + r * 0.3, 0.025, h * 0.3, '#f2c66a'); }
        }
      }
    }
    return (natCache[key] = { c: c, ox: W / 2, oy: oy, s: s, w: W, h: H });
  };

  /* inşaat alanı */
  var siteCache = {};
  art.site = function (n) {
    if (siteCache[n]) return siteCache[n];
    var s = n >= 3 ? 1.5 : 2, hz = n >= 2 ? 2.4 : 1.2, W = n * TW * s + 12, H = n * TH * s + hz * ZH * s + 10;
    var c = makeCanvas(W, H), k = new Kit(c.getContext('2d'), s, W / 2, hz * ZH * s + 4, false, 5);
    k.lot(n, '#b99f73');
    var m = 0.12, e = n - m;
    [[m, m], [e, m], [m, e], [e, e]].forEach(function (q) { k.ln([q[0], q[1], 0], [q[0], q[1], 0.5], '#d9a441', 1.6); });
    k.ln([m, e, 0.5], [e, e, 0.5], '#d9a441', 1.4); k.ln([e, m, 0.5], [e, e, 0.5], '#d9a441', 1.4); k.ln([m, e, 0.25], [e, e, 0.25], '#d9a441', 1); k.ln([e, m, 0.25], [e, e, 0.25], '#d9a441', 1);
    k.cone(n * 0.3, n * 0.7, 0.14 * Math.sqrt(n), 0, 0.16, '#d6c08f');
    k.box(n * 0.6, n * 0.25, 0.2, 0.12, 0, 0.08, '#b55a3c');
    if (n >= 2) {
      var cx = n * 0.25, cy = n * 0.3;
      k.ln([cx, cy, 0], [cx, cy, 2.0], '#e0b23a', 2.4); k.ln([cx - 0.3, cy + 0.3, 1.9], [cx + n * 0.5, cy - n * 0.5 + 0.2, 1.9], '#e0b23a', 1.8);
      k.ln([cx, cy, 2.2], [cx + n * 0.5, cy - n * 0.5 + 0.2, 1.9], '#555', 0.7); k.ln([cx, cy, 2.0], [cx, cy, 2.2], '#e0b23a', 2);
      k.ln([cx + n * 0.3, cy - n * 0.3 + 0.12, 1.9], [cx + n * 0.3, cy - n * 0.3 + 0.12, 1.0], '#333', 0.7);
    }
    return (siteCache[n] = { c: c, ox: W / 2, oy: hz * ZH * s + 4, s: s, w: c.width, h: c.height });
  };

  art.Kit = Kit;
  art.clearCache = function () { cache = {}; };
})();
