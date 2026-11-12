'use strict';
/* Kent Ustası - izometrik çizim motoru */
(function () {
  var D = CB.D, N = D.MAP, W = CB.world, T = W.T, B = D.B, art = CB.art;
  var TW = CB.TW, TH = CB.TH, ZH = CB.ZH, HW = TW / 2, HH = TH / 2;
  var R = CB.render = {};
  var cv, ctx, dpr = 1, vw = 0, vh = 0;
  var cam = R.cam = { x: 0, y: N * HH, z: 0.85, vx: 0, vy: 0 };
  var CH = 16, NCH = N / CH, chunks = [];
  var cars = [], roadList = [], roadDirty = true, smoke = [], floats = [];
  var frame = 0, objs = [];
  R.ghost = null; R.sel = null; R.overlay = null; R.expand = false; R.night = 0;

  R.init = function (canvas) {
    cv = canvas; ctx = cv.getContext('2d');
    R.resize();
    CB.on('terrain', function (e) { roadDirty = true; dirtyChunks(e.x - 1, e.y - 1, e.x + 4, e.y + 4); });
    CB.on('region', function () { roadDirty = true; });
  };
  R.reset = function () { chunks = []; cars = []; smoke = []; floats = []; roadDirty = true; R.sel = null; R.ghost = null; };
  R.resize = function () {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    vw = window.innerWidth; vh = window.innerHeight;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
  };
  function dirtyChunks(x0, y0, x1, y1) {
    for (var cy = Math.max(0, (y0 / CH) | 0); cy <= Math.min(NCH - 1, (y1 / CH) | 0); cy++)
      for (var cx = Math.max(0, (x0 / CH) | 0); cx <= Math.min(NCH - 1, (x1 / CH) | 0); cx++) { var c = chunks[cx + cy * NCH]; if (c) c.dirty = true; }
  }

  /* ---------- koordinat ---------- */
  R.w2s = function (tx, ty) {
    return [((tx - ty) * HW - cam.x) * cam.z + vw / 2, ((tx + ty) * HH - cam.y) * cam.z + vh / 2];
  };
  R.s2t = function (sx, sy) {
    var wx = (sx - vw / 2) / cam.z + cam.x, wy = (sy - vh / 2) / cam.z + cam.y;
    return [(wx / HW + wy / HH) / 2, (wy / HH - wx / HW) / 2];
  };
  R.centerOn = function (tx, ty) { cam.x = (tx - ty) * HW; cam.y = (tx + ty) * HH; clampCam(); };
  R.zoomAt = function (sx, sy, f) {
    var before = R.s2t(sx, sy);
    cam.z = CB.clamp(cam.z * f, 0.38, 2.4);
    var a = R.w2s(before[0], before[1]);
    cam.x += (a[0] - sx) / cam.z; cam.y += (a[1] - sy) / cam.z; clampCam();
  };
  R.setZoom = function (z) { var v = R.view(); R.zoomAt(v.w / 2, v.h / 2, z / cam.z); };
  R.pan = function (dx, dy) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; clampCam(); };
  function clampCam() {
    cam.x = CB.clamp(cam.x, -N * HW, N * HW); cam.y = CB.clamp(cam.y, 0, N * TH);
  }
  R.view = function () { return { w: vw, h: vh }; };

  /* ---------- seçim ---------- */
  R.pick = function (sx, sy) {
    var at = CB.sim.R.at;
    for (var dz = 420; dz >= 0; dz -= 6) {
      var t = R.s2t(sx, sy + dz * cam.z), x = Math.floor(t[0]), y = Math.floor(t[1]);
      if (!W.inB(x, y)) continue;
      var b = at[W.idx(x, y)];
      if (b && dz <= art.defs[b.id].hz * ZH * 0.92) return b;
    }
    return null;
  };

  R.float = function (tx, ty, text, col) { floats.push({ x: tx, y: ty, text: text, col: col || '#fff', life: 1.6 }); };

  /* ---------- zemin ---------- */
  function gvar(x, y) { return (CB.hash2(x, y, 5) * 4) | 0; }
  function buildChunk(cx, cy) {
    var c = chunks[cx + cy * NCH];
    if (!c) { c = chunks[cx + cy * NCH] = { c: document.createElement('canvas'), dirty: true }; c.c.width = CH * TW + 8; c.c.height = CH * TH + 8; }
    var g = c.c.getContext('2d'), S = CB.sim.S;
    g.clearRect(0, 0, c.c.width, c.c.height);
    for (var y = 0; y < CH; y++) for (var x = 0; x < CH; x++) {
      var tx = cx * CH + x, ty = cy * CH + y, sp = art.ground(S.terrain[W.idx(tx, ty)], gvar(tx, ty));
      g.drawImage(sp.c, (x - y) * HW + CH * HW + 4 - sp.ox / sp.s, (x + y) * HH + 4 - sp.oy / sp.s, sp.w / sp.s, sp.h / sp.s);
    }
    c.dirty = false;
    return c;
  }

  function diamond(x0, y0, x1, y1) { // karo aralığının ekran dörtgeni (x1,y1 hariç)
    var a = R.w2s(x0, y0), b = R.w2s(x1, y0), c = R.w2s(x1, y1), d = R.w2s(x0, y1);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
  }

  var OVC = {
    happy: function (b) { return b && B[b.id].cap && b.st !== 1 ? heat(b.h / 100) : null; },
    pol: function (b, i, cov) { var v = cov.pol[i]; return v > 0.5 ? 'rgba(120,60,20,' + Math.min(0.7, v / 30) + ')' : null; },
    police: function (b, i, cov) { return cov.police[i] > 0 ? 'rgba(52,120,246,' + (0.2 + cov.police[i] * 0.35) + ')' : null; },
    fire: function (b, i, cov) { return cov.fire[i] > 0 ? 'rgba(231,76,60,' + (0.2 + cov.fire[i] * 0.35) + ')' : null; },
    health: function (b, i, cov) { return cov.health[i] > 0 ? 'rgba(46,204,113,' + (0.2 + cov.health[i] * 0.35) + ')' : null; },
    edu: function (b, i, cov) { return cov.edu[i] > 0 ? 'rgba(241,196,15,' + (0.2 + cov.edu[i] * 0.35) + ')' : null; },
    leisure: function (b, i, cov) { return cov.leisure[i] > 0.3 ? 'rgba(155,89,182,' + Math.min(0.65, 0.15 + cov.leisure[i] / 30) + ')' : null; }
  };
  function heat(v) { // 0 kırmızı .. 1 yeşil
    v = CB.clamp(v, 0, 1);
    var r = v < 0.5 ? 231 : Math.round(231 - (v - 0.5) * 2 * 185), g = v < 0.5 ? Math.round(76 + v * 2 * 120) : 196;
    return 'rgba(' + r + ',' + g + ',60,0.6)';
  }

  /* ---------- araçlar ---------- */
  var CARCOL = ['#e74c3c', '#3498db', '#f1c40f', '#ecf0f1', '#2ecc71', '#9b59b6', '#e67e22', '#34495e'];
  function updateCars(dt) {
    var S = CB.sim.S, conn = CB.sim.R.conn, i;
    if (roadDirty) {
      roadList = []; for (i = 0; i < N * N; i++) if (S.road[i] && conn[i]) roadList.push(i);
      roadDirty = false;
    }
    var want = Math.min(70, Math.floor(roadList.length / 5), 4 + Math.floor(S.pop / 12));
    if (roadList.length < 4) want = 0;
    while (cars.length < want) {
      var k = roadList[(Math.random() * roadList.length) | 0];
      cars.push({ x: k % N, y: (k / N) | 0, nx: -1, ny: -1, px: -1, py: -1, p: 0, col: CARCOL[(Math.random() * CARCOL.length) | 0], v: 1.3 + Math.random() * 0.8 });
    }
    if (cars.length > want) cars.length = want;
    var sp = dt * (S.speed ? 1 : 0);
    for (i = cars.length - 1; i >= 0; i--) {
      var c = cars[i];
      if (!S.road[W.idx(c.x, c.y)]) { cars.splice(i, 1); continue; }
      if (c.nx < 0) {
        var opts = [], back = null;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var ax = c.x + d[0], ay = c.y + d[1];
          if (W.inB(ax, ay) && S.road[W.idx(ax, ay)]) { if (ax === c.px && ay === c.py) back = [ax, ay]; else opts.push([ax, ay]); }
        });
        var o = opts.length ? opts[(Math.random() * opts.length) | 0] : back;
        if (!o) { cars.splice(i, 1); continue; }
        c.nx = o[0]; c.ny = o[1]; c.p = 0;
      }
      c.p += sp * c.v;
      if (c.p >= 1) { c.px = c.x; c.py = c.y; c.x = c.nx; c.y = c.ny; c.nx = -1; c.p = 0; }
    }
  }
  function carPos(c) {
    var dx = c.nx < 0 ? 0 : c.nx - c.x, dy = c.nx < 0 ? 0 : c.ny - c.y;
    return [c.x + 0.5 + dx * c.p - dy * 0.14, c.y + 0.5 + dy * c.p + dx * 0.14, dx, dy];
  }
  function drawCar(c) {
    var q = carPos(c), dx = q[2], dy = q[3];
    var lx = dx ? 0.17 : 0.085, ly = dx ? 0.085 : 0.17, z = cam.z, h = 0.13 * ZH * z;
    var a = R.w2s(q[0] - lx, q[1] - ly), b = R.w2s(q[0] + lx, q[1] - ly), d = R.w2s(q[0] + lx, q[1] + ly), e = R.w2s(q[0] - lx, q[1] + ly);
    var col = c.col, nf = R.night;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.moveTo(a[0], a[1] + 1); ctx.lineTo(b[0], b[1] + 1); ctx.lineTo(d[0], d[1] + 1); ctx.lineTo(e[0], e[1] + 1); ctx.fill();
    ctx.fillStyle = art.shade(col, nf > 0.5 ? 0.45 : 0.75); ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(d[0], d[1]); ctx.lineTo(d[0], d[1] - h); ctx.lineTo(e[0], e[1] - h); ctx.fill();
    ctx.fillStyle = art.shade(col, nf > 0.5 ? 0.35 : 0.6); ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(d[0], d[1]); ctx.lineTo(d[0], d[1] - h); ctx.lineTo(b[0], b[1] - h); ctx.fill();
    ctx.fillStyle = nf > 0.5 ? art.shade(col, 0.55) : col; ctx.beginPath(); ctx.moveTo(a[0], a[1] - h); ctx.lineTo(b[0], b[1] - h); ctx.lineTo(d[0], d[1] - h); ctx.lineTo(e[0], e[1] - h); ctx.fill();
    if (nf > 0.4 && (dx || dy)) {
      var f = R.w2s(q[0] + dx * 0.3, q[1] + dy * 0.3);
      ctx.fillStyle = 'rgba(255,240,170,' + (0.5 * nf) + ')'; ctx.beginPath(); ctx.arc(f[0], f[1] - h * 0.4, 5 * z, 0, 6.3); ctx.fill();
    }
  }

  /* ---------- nesne çizimi ---------- */
  function drawSprite(sp, sx, sy, alpha) {
    var k = cam.z / sp.s;
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.drawImage(sp.c, sx - sp.ox * k, sy - sp.oy * k, sp.w * k, sp.h * k);
    if (alpha !== undefined) ctx.globalAlpha = 1;
  }
  function bar(sx, sy, w, p, col) {
    ctx.fillStyle = 'rgba(20,30,40,0.75)'; rr(sx - w / 2 - 1, sy - 1, w + 2, 7, 3); ctx.fill();
    ctx.fillStyle = col; rr(sx - w / 2, sy, Math.max(2, w * p), 5, 2.5); ctx.fill();
  }
  function rr(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  }
  function badge(sx, sy, icon, bg) {
    var r = 11;
    ctx.fillStyle = bg || 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx - 4, sy + r - 2); ctx.lineTo(sx, sy + r + 5); ctx.lineTo(sx + 4, sy + r - 2); ctx.fill();
    ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(icon, sx, sy + 1);
  }

  function drawBuilding(b, time) {
    var def = B[b.id], ad = art.defs[b.id], z = cam.z, s = R.w2s(b.x, b.y);
    var vr = art.variantOf(b), sp = art.sprite(b.id, b.l, vr, false), nf = R.night;
    var topY = s[1] - ad.hz * ZH * z * 0.82, midX = s[0], n = def.size;
    if (b.st === 1) {
      var site = art.site(n); drawSprite(site, s[0], s[1]);
      if (nf > 0.02) { ctx.fillStyle = 'rgba(14,22,62,' + (0.35 * nf) + ')'; diamondFill(b.x, b.y, n); }
      var p = b.tot > 0 ? CB.clamp(1 - b.q / b.tot, 0, 1) : 1;
      if (p > 0.03 && !b.wait) {
        var k = z / sp.s, hp = Math.round((sp.h - 4) * p);
        ctx.globalAlpha = 0.9;
        ctx.drawImage(sp.c, 0, sp.h - hp, sp.w, hp, s[0] - sp.ox * k, s[1] - sp.oy * k + (sp.h - hp) * k, sp.w * k, hp * k);
        ctx.globalAlpha = 1;
      }
      var by = s[1] + n * HH * z - Math.min(ad.hz, 2.2) * ZH * z * 0.6 - 16;
      if (z > 0.45) {
        if (b.wait) badge(midX, by, '⏳');
        else bar(midX, by, Math.max(26, 30 * n * z), p, '#f1c40f');
      }
      return;
    }
    drawSprite(sp, s[0], s[1]);
    if (nf > 0.02) drawSprite(art.sprite(b.id, b.l, vr, true), s[0], s[1], nf);
    // animasyonlar
    if (ad.anim && z > 0.4) {
      var an = ad.anim, hx = s[0] + (an.u - an.v) * HW * z, hy = s[1] + (an.u + an.v) * HH * z - an.z * ZH * z, i, a;
      if (an.t === 'wind') {
        var spd = b.ok ? 2.2 : 0, L = 30 * z;
        ctx.strokeStyle = nf > 0.5 ? '#9aa6c0' : '#fafafa'; ctx.lineWidth = Math.max(1.2, 3 * z); ctx.lineCap = 'round';
        for (i = 0; i < 3; i++) { a = time * spd + b.uid + i * 2.094; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(a) * L * 0.55, hy + Math.sin(a) * L); ctx.stroke(); }
        ctx.fillStyle = '#ccc'; ctx.beginPath(); ctx.arc(hx, hy, 2.2 * z, 0, 6.3); ctx.fill();
      } else if (an.t === 'wheel') {
        var r = an.r * 0.5 * ZH * z, sq = 0.78, rot = time * (b.ok ? 0.5 : 0);
        ctx.strokeStyle = nf > 0.5 ? '#c8b8e8' : '#e9eef2'; ctx.lineWidth = Math.max(1, 2.2 * z);
        ctx.beginPath(); ctx.ellipse(hx, hy, r * sq, r, 0, 0, 6.3); ctx.stroke();
        ctx.lineWidth = Math.max(0.6, 1 * z);
        for (i = 0; i < 8; i++) {
          a = rot + i * 0.785; var ex = hx + Math.cos(a) * r * sq, ey = hy + Math.sin(a) * r;
          ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
          ctx.fillStyle = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'][i % 4]; ctx.fillRect(ex - 2.5 * z, ey, 5 * z, 5 * z);
        }
      }
    }
    // duman
    if (ad.smoke && b.ok && b.eff > 0.1 && z > 0.45 && (frame + b.uid * 7) % 14 === 0 && smoke.length < 160) {
      var sm = ad.smoke[(Math.random() * ad.smoke.length) | 0];
      smoke.push({ x: (b.x + sm[0] - b.y - sm[1]) * HW, y: (b.x + sm[0] + b.y + sm[1]) * HH - sm[2] * ZH, r: 3, life: 1, col: sm[3] });
    }
    // yangın
    if (b.fire > 0) {
      for (var f = 0; f < 5; f++) {
        var fx = midX + Math.sin(time * 9 + f * 2.1) * 10 * n * z, fy = s[1] + n * HH * z - (8 + f * 9 + Math.sin(time * 13 + f) * 4) * z * Math.min(3, ad.hz);
        ctx.fillStyle = ['rgba(255,90,20,0.85)', 'rgba(255,170,30,0.85)', 'rgba(255,220,80,0.8)'][f % 3];
        ctx.beginPath(); ctx.arc(fx, fy, (9 - f) * z * Math.sqrt(n), 0, 6.3); ctx.fill();
      }
      if (frame % 6 === 0 && smoke.length < 160) smoke.push({ x: (b.x - b.y) * HW, y: (b.x + b.y + n) * HH - ad.hz * ZH * 0.7, r: 5, life: 1, col: '#333' });
    }
    if (z > 0.5) {
      if (b.st === 2) bar(midX, topY - 8, Math.max(26, 26 * n * z), CB.clamp(1 - b.q / b.tot, 0, 1), '#3498db');
      else if (b.pi && (b.fire > 0 || Math.sin(time * 3 + b.uid) > -0.5)) badge(midX, topY - 12, b.pi, b.pibg);
    }
  }
  function diamondFill(x, y, n) { diamond(x, y, x + n, y + n); ctx.fill(); }

  /* ---------- ana çizim ---------- */
  R.draw = function (time, dt) {
    var S = CB.sim.S, SR = CB.sim.R, z = cam.z, x, y, i, s;
    frame++;
    // kamera ataleti
    if (Math.abs(cam.vx) > 0.5 || Math.abs(cam.vy) > 0.5) { R.pan(cam.vx * dt, cam.vy * dt); cam.vx *= Math.pow(0.02, dt); cam.vy *= Math.pow(0.02, dt); }
    // gece
    var ph = (S.t % D.TICKS_DAY) / D.TICKS_DAY, nf = 0;
    if (S.set.night) { if (ph > 0.68 && ph < 0.76) nf = (ph - 0.68) / 0.08; else if (ph >= 0.76 && ph < 0.94) nf = 1; else if (ph >= 0.94) nf = 1 - (ph - 0.94) / 0.06; }
    R.night = nf;
    updateCars(dt);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = nf > 0 ? 'rgb(' + Math.round(47 - 30 * nf) + ',' + Math.round(126 - 90 * nf) + ',' + Math.round(180 - 100 * nf) + ')' : '#2f7eb4';
    ctx.fillRect(0, 0, vw, vh);

    // görünür karo aralığı
    var c0 = R.s2t(0, 0), c1 = R.s2t(vw, 0), c2 = R.s2t(vw, vh), c3 = R.s2t(0, vh);
    var x0 = Math.max(0, Math.floor(c0[0]) - 1), x1 = Math.min(N - 1, Math.ceil(c2[0]) + 2);
    var y0 = Math.max(0, Math.floor(c1[1]) - 1), y1 = Math.min(N - 1, Math.ceil(c3[1]) + 2);
    var mgx = 80 * z, mgy = 60 * z;
    function vis(sx, sy, up) { return sx > -mgx && sx < vw + mgx && sy > -mgy && sy < vh + mgy + (up || 0); }

    // zemin
    ctx.imageSmoothingEnabled = true;
    if (z * dpr <= 1.25) {
      for (var cy = (y0 / CH) | 0; cy <= ((y1 / CH) | 0); cy++) for (var cx = (x0 / CH) | 0; cx <= ((x1 / CH) | 0); cx++) {
        var ch = chunks[cx + cy * NCH];
        if (!ch || ch.dirty) ch = buildChunk(cx, cy);
        s = R.w2s(cx * CH, cy * CH);
        ctx.drawImage(ch.c, s[0] - (CH * HW + 4) * z, s[1] - 4 * z, ch.c.width * z, ch.c.height * z);
      }
    } else {
      for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
        s = R.w2s(x, y);
        if (!vis(s[0], s[1])) continue;
        var gs = art.ground(S.terrain[W.idx(x, y)], gvar(x, y)), k = z / gs.s;
        ctx.drawImage(gs.c, s[0] - gs.ox * k, s[1] - gs.oy * k, gs.w * k, gs.h * k);
      }
    }
    // kilitli bölgeler
    var cost = R.expand ? CB.sim.regionCost() : 0, pulse = 0.5 + 0.5 * Math.sin(time * 4);
    for (i = 0; i < 64; i++) {
      if (S.own[i]) continue;
      var rx = (i % 8) * 8, ry = ((i / 8) | 0) * 8;
      if (rx + 8 < x0 || rx > x1 || ry + 8 < y0 || ry > y1) continue;
      var buy = R.expand && CB.sim.regionBuyable(i);
      ctx.fillStyle = buy ? 'rgba(46,204,113,' + (0.25 + 0.15 * pulse) + ')' : 'rgba(12,22,44,0.46)';
      diamond(rx, ry, rx + 8, ry + 8); ctx.fill();
      if (R.expand) { ctx.strokeStyle = buy ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)'; ctx.lineWidth = buy ? 2 : 1; ctx.stroke(); }
      if (buy) {
        s = R.w2s(rx + 4, ry + 4);
        ctx.font = 'bold ' + Math.round(CB.clamp(15 * z + 6, 11, 22)) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,40,20,0.8)'; ctx.strokeText('₺' + CB.fmt(cost), s[0], s[1]); ctx.fillStyle = '#fff'; ctx.fillText('₺' + CB.fmt(cost), s[0], s[1]);
      }
    }
    // yollar
    for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
      var ri = W.idx(x, y), rv = S.road[ri];
      if (!rv) continue;
      s = R.w2s(x, y);
      if (!vis(s[0], s[1])) continue;
      var m = (x > 0 && S.road[ri - 1] ? 1 : 0) | (x < N - 1 && S.road[ri + 1] ? 2 : 0) | (y > 0 && S.road[ri - N] ? 4 : 0) | (y < N - 1 && S.road[ri + N] ? 8 : 0);
      drawSprite(art.road(m, rv === 2), s[0], s[1]);
      if (!SR.conn[ri] && frame % 60 < 40) { ctx.fillStyle = 'rgba(231,76,60,0.35)'; diamondFill(x, y, 1); }
    }
    // ısı haritası
    if (R.overlay && OVC[R.overlay]) {
      var fn = OVC[R.overlay];
      for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
        var oi = W.idx(x, y), col = fn(SR.at[oi], oi, SR.cov);
        if (!col) continue;
        ctx.fillStyle = col; diamondFill(x, y, 1);
      }
    }
    // gece zemin karartması
    if (nf > 0.02) { ctx.fillStyle = 'rgba(14,22,62,' + (0.55 * nf) + ')'; ctx.fillRect(0, 0, vw, vh); }

    // seçim / menzil
    var hl = R.ghost && R.ghost.x !== null && B[R.ghost.id] ? { x: R.ghost.x, y: R.ghost.y, def: B[R.ghost.id], l: R.ghost.move ? R.ghost.move.l : 1 } : (R.sel ? { x: R.sel.x, y: R.sel.y, def: B[R.sel.id], l: R.sel.l } : null);
    if (hl) {
      var rad = 0, rc = 'rgba(255,255,255,0.9)';
      if (hl.def.svc) rad = hl.def.svc.r * D.LR[hl.l - 1] * (1 + SR.mod.radius) + hl.def.size / 2 - 0.5;
      else if (hl.def.pol) { rad = hl.def.pol.r + hl.def.size / 2; rc = 'rgba(160,90,40,0.9)'; }
      else if (hl.def.need) rad = ({ forest: 3, rock: 2, ore: 2, water: 1 })[hl.def.need] + hl.def.size / 2;
      if (rad) {
        s = R.w2s(hl.x + hl.def.size / 2, hl.y + hl.def.size / 2);
        ctx.beginPath(); ctx.ellipse(s[0], s[1], rad * TW * 0.7071 * z, rad * TH * 0.7071 * z, 0, 0, 6.3);
        ctx.fillStyle = hl.def.pol && !hl.def.svc ? 'rgba(160,90,40,0.14)' : 'rgba(255,255,255,0.13)'; ctx.fill();
        ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeStyle = rc; ctx.stroke(); ctx.setLineDash([]);
      }
    }
    if (R.sel && !R.ghost) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * pulse) + ')'; ctx.lineWidth = 2.5; diamond(R.sel.x, R.sel.y, R.sel.x + B[R.sel.id].size, R.sel.y + B[R.sel.id].size); ctx.stroke();
    }

    // nesneler
    objs.length = 0;
    var seen = frame, mv = R.ghost && R.ghost.move;
    for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
      var ti = W.idx(x, y), b = SR.at[ti];
      if (b) {
        if (b._f === seen || b === mv) continue; b._f = seen;
        var n = B[b.id].size; s = R.w2s(b.x + n / 2, b.y + n / 2);
        if (s[0] < -n * HW * z - 40 || s[0] > vw + n * HW * z + 40 || s[1] < -n * HH * z - 20 || s[1] > vh + art.defs[b.id].hz * ZH * z + n * HH * z) continue;
        objs.push({ d: b.x + b.y + n, b: b });
      } else {
        var ter = S.terrain[ti];
        if ((ter === T.FOREST || ter === T.ROCK || ter === T.ORE) && !S.road[ti]) {
          s = R.w2s(x, y);
          if (vis(s[0], s[1], 60 * z)) objs.push({ d: x + y + 1, t: ter, x: x, y: y, sx: s[0], sy: s[1] });
        }
      }
    }
    if (z > 0.42) for (i = 0; i < cars.length; i++) { var q = carPos(cars[i]); if (q[0] >= x0 && q[0] <= x1 + 1 && q[1] >= y0 && q[1] <= y1 + 1) objs.push({ d: q[0] + q[1] - 0.2, car: cars[i] }); }
    objs.sort(function (a, b) { return a.d - b.d; });
    for (i = 0; i < objs.length; i++) {
      var o = objs[i];
      if (o.b) drawBuilding(o.b, time);
      else if (o.car) drawCar(o.car);
      else {
        var ns = art.nature(o.t, gvar(o.x, o.y), false);
        drawSprite(ns, o.sx, o.sy);
        if (nf > 0.02) drawSprite(art.nature(o.t, gvar(o.x, o.y), true), o.sx, o.sy, nf);
      }
    }

    // duman
    for (i = smoke.length - 1; i >= 0; i--) {
      var p = smoke[i]; p.life -= dt * 0.45; p.y -= dt * 22; p.x += dt * 7; p.r += dt * 7;
      if (p.life <= 0) { smoke.splice(i, 1); continue; }
      var px = (p.x - cam.x) * z + vw / 2, py = (p.y - cam.y) * z + vh / 2;
      ctx.globalAlpha = p.life * 0.5; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(px, py, p.r * z, 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // hayalet (yerleştirme)
    var g = R.ghost;
    if (g && g.x !== null) {
      var gd = B[g.id], gn = gd.size;
      ctx.fillStyle = g.ok ? 'rgba(46,204,113,0.45)' : 'rgba(231,76,60,0.5)'; diamondFill(g.x, g.y, gn);
      ctx.strokeStyle = g.ok ? '#eafff2' : '#ffecec'; ctx.lineWidth = 2; ctx.stroke();
      if (art.defs[g.id]) {
        s = R.w2s(g.x, g.y);
        var bob = Math.sin(time * 5) * 2;
        drawSprite(art.sprite(g.id, g.move ? g.move.l : 1, g.move ? art.variantOf({ x: g.x, y: g.y }) : 0, false), s[0], s[1] - 4 - bob, g.ok ? 0.85 : 0.5);
      }
    }

    // uçan yazılar
    for (i = floats.length - 1; i >= 0; i--) {
      var ft = floats[i]; ft.life -= dt;
      if (ft.life <= 0) { floats.splice(i, 1); continue; }
      s = R.w2s(ft.x, ft.y);
      var fy2 = s[1] - 30 * z - (1.6 - ft.life) * 34;
      ctx.globalAlpha = Math.min(1, ft.life * 1.5);
      ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.strokeText(ft.text, s[0], fy2); ctx.fillStyle = ft.col; ctx.fillText(ft.text, s[0], fy2);
    }
    ctx.globalAlpha = 1;
  };

  /* bina sorun rozetleri (seyrek güncellenir) */
  R.refreshBadges = function () {
    var S = CB.sim.S;
    for (var i = 0; i < S.bl.length; i++) {
      var b = S.bl[i], p = CB.sim.problems(b);
      b.pi = p.length ? p[0].i : null;
      b.pibg = p.length && (p[0].i === '🔥' || p[0].i === '🔧') ? 'rgba(255,220,210,0.97)' : null;
    }
  };
})();
