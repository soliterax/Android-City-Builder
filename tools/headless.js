// Oyun mantığını tarayıcı olmadan yükler (test ve denge simülasyonu için)
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'game', 'js');
module.exports = function load() {
  const ctx = vm.createContext({ console, Math, Date, JSON, Uint8Array, Float32Array, Array, Object, String, Number, isNaN, parseInt, parseFloat });
  ctx.globalThis = ctx;
  for (const f of ['util.js', 'data.js', 'world.js', 'sim.js']) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
  return ctx.CB;
};
