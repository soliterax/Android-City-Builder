'use strict';
/* Kent Ustası - dokunmatik / fare girişi ve yerleştirme modları */
(function () {
  var D = CB.D, B = D.B, W = CB.world, R = CB.render, sim = CB.sim;
  var I = CB.input = { mode: 'idle', tool: null };
  var cv, pts = {}, npts = 0, moved = false, dragGhost = false, painting = false, lastTile = null;
  var pinch = null, lastToast = '', lastToastT = 0, vel = [], downAt = 0;

  function tileAt(sx, sy) { var t = R.s2t(sx, sy); return [Math.floor(t[0]), Math.floor(t[1])]; }

  /* ---------- modlar ---------- */
  I.setPlace = function (id, moveB) {
    var def = B[id];
    I.mode = 'place'; I.tool = id; R.sel = null;
    R.ghost = { id: id, x: null, y: null, ok: false, reason: '', move: moveB || null };
    var v = R.view(), t = moveB ? [moveB.x, moveB.y] : tileAt(v.w / 2, v.h * 0.42);
    if (!moveB) { t[0] -= (def.size - 1) >> 1; t[1] -= (def.size - 1) >> 1; }
    I.moveGhost(t[0], t[1]);
    CB.emit('mode', {});
  };
  I.setPaint = function (id) { I.mode = 'paint'; I.tool = id; R.ghost = null; R.sel = null; CB.emit('mode', {}); };
  I.setExpand = function (on) { I.mode = on ? 'expand' : 'idle'; I.tool = null; R.expand = on; R.ghost = null; R.sel = null; CB.emit('mode', {}); };
  I.cancel = function () { I.mode = 'idle'; I.tool = null; R.ghost = null; R.expand = false; CB.emit('mode', {}); };

  I.moveGhost = function (x, y) {
    var g = R.ghost; if (!g) return;
    var def = B[g.id], n = D.MAP - def.size;
    g.x = CB.clamp(x, 0, n); g.y = CB.clamp(y, 0, n);
    I.validate();
  };
  I.validate = function () {
    var g = R.ghost; if (!g || g.x === null) return;
    var def = B[g.id], c = sim.canPlace(g.id, g.x, g.y, g.move);
    g.ok = c.ok; g.reason = c.ok ? '' : c.reason; g.trees = c.trees || 0;
    var why = c.ok && !g.move ? sim.affordReason(def.cost, g.trees * 15) : '';
    if (why) { g.ok = false; g.reason = why; }
    if (c.ok && !g.move && def.max && sim.totalOf(g.id) >= def.max) { g.ok = false; g.reason = 'En fazla ' + def.max + ' adet'; }
    CB.emit('ghost', {});
  };
  I.confirm = function () {
    var g = R.ghost; if (!g || g.x === null) return;
    var def = B[g.id], r;
    if (g.move) {
      r = sim.move(g.move, g.x, g.y);
      if (!r.ok) { CB.emit('toast', { text: r.reason, bad: true }); CB.emit('sfx', 'error'); return; }
      CB.emit('sfx', 'place'); var mb = g.move; I.cancel(); CB.emit('select', mb);
      return;
    }
    r = sim.place(g.id, g.x, g.y);
    if (!r.ok) { CB.emit('toast', { text: r.reason, bad: true }); CB.emit('sfx', 'error'); I.validate(); return; }
    CB.emit('sfx', 'place'); CB.emit('haptic', 15);
    R.float(g.x + def.size / 2, g.y + def.size / 2, '-₺' + CB.fmt((def.cost.money || 0) + (g.trees || 0) * 15), '#ffd9a0');
    if (def.max && sim.totalOf(g.id) >= def.max) { I.cancel(); return; }
    g.x = null; g.y = null; CB.emit('ghost', {});
  };

  function paintAt(x, y, isTap) {
    if (!W.inB(x, y)) return;
    var r;
    if (I.tool === 'bulldoze') {
      var b = sim.R.at[W.idx(x, y)];
      if (b) { if (isTap) CB.emit('askDemolish', b); return; }
      r = sim.bulldozeTile(x, y);
      if (r.ok) CB.emit('sfx', 'tap');
    } else {
      r = sim.place(I.tool, x, y);
      if (r.ok) { CB.emit('sfx', 'tap'); }
    }
    if (!r.ok && !r.silent && r.reason && r.reason.indexOf('zaten') < 0 && r.reason !== 'Burası dolu') {
      var now = Date.now();
      if (r.reason !== lastToast || now - lastToastT > 1800) { lastToast = r.reason; lastToastT = now; CB.emit('toast', { text: r.reason, bad: true }); }
    }
  }
  function paintLine(a, b) {
    var x = a[0], y = a[1], guard = 0;
    while ((x !== b[0] || y !== b[1]) && guard++ < 200) {
      if (x !== b[0]) x += b[0] > x ? 1 : -1; else y += b[1] > y ? 1 : -1;
      paintAt(x, y, false);
    }
  }

  /* ---------- olaylar ---------- */
  function down(e) {
    if (e.button && e.button !== 0) return;
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* yok say */ }
    pts[e.pointerId] = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY };
    npts = Object.keys(pts).length;
    R.cam.vx = R.cam.vy = 0; vel = [];
    CB.emit('userGesture', {});
    if (npts === 1) {
      moved = false; dragGhost = false; painting = false; downAt = Date.now();
      var t = tileAt(e.clientX, e.clientY), g = R.ghost;
      if (I.mode === 'paint') { painting = true; lastTile = t; }
      else if (I.mode === 'place' && g && g.x !== null) {
        var n = B[g.id].size;
        if (t[0] >= g.x - 1 && t[0] <= g.x + n && t[1] >= g.y - 1 && t[1] <= g.y + n) dragGhost = true;
      }
    } else if (npts === 2) {
      painting = false; dragGhost = false; moved = true;
      var k = Object.keys(pts), a = pts[k[0]], b = pts[k[1]];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    }
    e.preventDefault();
  }
  function move(e) {
    var p = pts[e.pointerId]; if (!p) return;
    var dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (npts === 1) {
      if (!moved && Math.hypot(p.x - p.sx, p.y - p.sy) > 9) moved = true;
      if (!moved) return;
      var t = tileAt(p.x, p.y);
      if (painting) {
        if (lastTile && (t[0] !== lastTile[0] || t[1] !== lastTile[1])) {
          if (!p.started) { paintAt(lastTile[0], lastTile[1], false); p.started = true; }
          paintLine(lastTile, t); lastTile = t;
        }
      } else if (dragGhost) {
        var n = B[R.ghost.id].size;
        I.moveGhost(t[0] - ((n - 1) >> 1), t[1] - ((n - 1) >> 1));
      } else {
        R.pan(dx, dy);
        vel.push([dx, dy, Date.now()]); if (vel.length > 5) vel.shift();
      }
    } else if (npts === 2 && pinch) {
      var k = Object.keys(pts), a = pts[k[0]], b = pts[k[1]];
      var d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      R.pan(mx - pinch.mx, my - pinch.my);
      if (pinch.d > 10) R.zoomAt(mx, my, d / pinch.d);
      pinch.d = d; pinch.mx = mx; pinch.my = my;
    }
    e.preventDefault();
  }
  function up(e) {
    var p = pts[e.pointerId]; if (!p) return;
    delete pts[e.pointerId]; npts = Object.keys(pts).length;
    if (npts === 1) { pinch = null; return; }
    if (npts > 0) return;
    pinch = null;
    if (!moved && e.type !== 'pointercancel') tap(p.x, p.y);
    else if (!painting && !dragGhost && vel.length > 1) {
      var now = Date.now(), vx = 0, vy = 0, c = 0;
      for (var i = 0; i < vel.length; i++) if (now - vel[i][2] < 90) { vx += vel[i][0]; vy += vel[i][1]; c++; }
      if (c) { R.cam.vx = vx / c * 60; R.cam.vy = vy / c * 60; }
    }
    painting = false; dragGhost = false;
  }
  function tap(sx, sy) {
    var t = tileAt(sx, sy), g = R.ghost;
    if (I.mode === 'paint') { paintAt(t[0], t[1], true); return; }
    if (I.mode === 'place') {
      var n = B[g.id].size;
      if (g.x !== null && g.ok && t[0] >= g.x && t[0] < g.x + n && t[1] >= g.y && t[1] < g.y + n) { I.confirm(); return; }
      I.moveGhost(t[0] - ((n - 1) >> 1), t[1] - ((n - 1) >> 1)); CB.emit('sfx', 'tap');
      return;
    }
    if (I.mode === 'expand') {
      if (!W.inB(t[0], t[1])) return;
      var r = W.regOf(t[0], t[1]);
      if (sim.S.own[r]) return;
      if (sim.regionBuyable(r)) CB.emit('askRegion', r);
      else CB.emit('toast', { text: 'Sadece sınırındaki bölgeleri alabilirsin', bad: true });
      return;
    }
    var b = R.pick(sx, sy);
    CB.emit('select', b);
    if (b) CB.emit('sfx', 'tap');
  }
  function wheel(e) { R.zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 0.89); e.preventDefault(); }

  I.init = function (canvas) {
    cv = canvas;
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', wheel, { passive: false });
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };
})();
