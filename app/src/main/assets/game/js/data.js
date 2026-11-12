'use strict';
/* Kent Ustası - oyun verileri: kaynaklar, binalar, araştırmalar, görevler */
(function () {
  var D = CB.D = {};
  D.MAP = 64;          // harita kenarı (kare)
  D.REG = 8;           // bölge kenarı
  D.TICKS_DAY = 300;   // bir oyun günü (saniye, 1x hızda)

  D.RES = {
    food: { name: 'Gıda', icon: '🍞', price: 4, lvl: 1 },
    wood: { name: 'Kereste', icon: '🌲', price: 5, lvl: 1 },
    stone: { name: 'Taş', icon: '🗿', price: 7, lvl: 4 },
    ore: { name: 'Cevher', icon: '⛏️', price: 9, lvl: 9 },
    steel: { name: 'Çelik', icon: '🔩', price: 24, lvl: 10 },
    goods: { name: 'Mal', icon: '📦', price: 34, lvl: 15 },
    elec: { name: 'Elektronik', icon: '📱', price: 90, lvl: 24 }
  };
  D.RES_ORDER = ['food', 'wood', 'stone', 'ore', 'steel', 'goods', 'elec'];

  D.CATS = [
    { id: 'road', name: 'Yol', icon: '🛣️' },
    { id: 'res', name: 'Konut', icon: '🏠' },
    { id: 'com', name: 'Ticaret', icon: '🏪' },
    { id: 'ind', name: 'Sanayi', icon: '🏭' },
    { id: 'util', name: 'Altyapı', icon: '⚡' },
    { id: 'svc', name: 'Hizmet', icon: '🏥' },
    { id: 'park', name: 'Park', icon: '🌳' },
    { id: 'spec', name: 'Özel', icon: '🏛️' },
    { id: 'wonder', name: 'Anıt', icon: '🗼' }
  ];

  /* seviye çarpanları (yükseltme) */
  D.LM = [1, 1.6, 2.4];         // üretim / kapasite
  D.LW = [1, 1.3, 1.6];         // işçi
  D.LU = [1, 1.5, 2.1];         // bakım
  D.LR = [1, 1.15, 1.3];        // hizmet yarıçapı
  D.UPC = [1, 1.8, 3.5];        // yükseltme maliyet çarpanı
  D.UPT = [1, 1.5, 3];          // yükseltme süre çarpanı

  var B = D.B = {};
  D.ORDER = [];
  function b(id, o) {
    o.id = id; o.size = o.size || 1; o.cost = o.cost || {}; o.lvl = o.lvl || 1; o.time = o.time || 0;
    B[id] = o; D.ORDER.push(id);
  }

  /* ---------- YOL ---------- */
  b('road', { name: 'Yol', cat: 'road', tool: true, cost: { money: 10 }, desc: 'Binalar çalışmak için belediyeye bağlı bir yola bitişik olmalı. Sürükleyerek çiz.' });
  b('bridge', { name: 'Köprü', cat: 'road', tool: true, lvl: 6, cost: { money: 150, stone: 4 }, desc: 'Suyun üzerinden yol geçirir. Sadece suya kurulur.' });
  b('bulldoze', { name: 'Yıkım', cat: 'road', tool: true, cost: {}, desc: 'Yolları ve ağaçları sürükleyerek temizle. Binaları yıkmak için binaya dokun.' });

  /* ---------- KONUT ---------- */
  b('hut', { name: 'Kulübe', cat: 'res', lvl: 1, cost: { money: 80, wood: 5 }, time: 6, cap: 5, tax: 0.8, pw: 1, wt: 1, desc: 'Küçük ve ucuz bir başlangıç evi.' });
  b('house', { name: 'Ev', cat: 'res', lvl: 3, cost: { money: 350, wood: 15, stone: 5 }, time: 20, cap: 10, tax: 1, pw: 2, wt: 2, desc: 'Bahçeli aile evi.' });
  b('townhouse', { name: 'Sıra Evler', cat: 'res', size: 2, lvl: 6, cost: { money: 1800, wood: 50, stone: 30 }, time: 60, cap: 38, tax: 1.05, pw: 6, wt: 6, desc: 'Bitişik nizam evler; alanı verimli kullanır.' });
  b('apartment', { name: 'Apartman', cat: 'res', size: 2, lvl: 10, cost: { money: 6500, wood: 60, stone: 120, steel: 15 }, time: 180, cap: 95, tax: 1.1, pw: 14, wt: 14, desc: 'Çok katlı konut.' });
  b('villa', { name: 'Villa', cat: 'res', size: 2, lvl: 13, cost: { money: 12000, wood: 150, stone: 100 }, time: 240, cap: 14, tax: 6, pw: 6, wt: 8, desc: 'Az kişi barındırır ama çok vergi öder. Mutluluk ister.' });
  b('block', { name: 'Konut Bloğu', cat: 'res', size: 2, lvl: 16, cost: { money: 22000, stone: 300, steel: 80 }, time: 420, cap: 210, tax: 1.15, pw: 30, wt: 30, desc: 'Yüksek yoğunluklu modern blok.' });
  b('residence', { name: 'Rezidans', cat: 'res', size: 2, lvl: 22, cost: { money: 80000, stone: 500, steel: 300, goods: 50 }, time: 900, cap: 400, tax: 1.4, pw: 60, wt: 55, desc: 'Lüks cam kule.' });
  b('skyscraper', { name: 'Gökdelen', cat: 'res', size: 3, lvl: 30, cost: { money: 400000, stone: 1500, steel: 1500, elec: 100 }, time: 2700, cap: 1150, tax: 1.6, pw: 180, wt: 150, desc: 'Şehrin siluetini değiştiren dev kule.' });
  b('arcology', { name: 'Ekokule', cat: 'res', size: 3, lvl: 38, cost: { money: 2500000, steel: 5000, goods: 1000, elec: 800 }, time: 7200, cap: 3200, tax: 2, pw: 300, wt: 250, desc: 'Kendi kendine yeten geleceğin yaşam kulesi.' });

  /* ---------- TİCARET ---------- */
  b('shop', { name: 'Bakkal', cat: 'com', lvl: 2, cost: { money: 250, wood: 10 }, time: 12, workers: 3, inc: 24, cust: 20, pw: 1, wt: 1, up: 2, desc: 'Mahallenin ilk dükkânı.' });
  b('market', { name: 'Market', cat: 'com', size: 2, lvl: 5, cost: { money: 1500, wood: 40, stone: 20 }, time: 45, workers: 10, inc: 110, cust: 90, cons: { food: 2 }, pw: 4, wt: 3, up: 10, desc: 'Gıda satar. Gıda stoğu yoksa geliri düşer.' });
  b('restaurant', { name: 'Restoran', cat: 'com', lvl: 7, cost: { money: 2200, wood: 30, stone: 20 }, time: 60, workers: 6, inc: 85, cust: 50, cons: { food: 3 }, pw: 3, wt: 4, up: 8, desc: 'Lezzet durağı. Gıda tüketir.' });
  b('office', { name: 'Ofis', cat: 'com', size: 2, lvl: 12, cost: { money: 14000, stone: 150, steel: 60 }, time: 300, workers: 40, inc: 460, pw: 20, wt: 10, up: 45, desc: 'Müşteri gerektirmeyen iş merkezi; çok işçi çalıştırır.' });
  b('mall', { name: 'AVM', cat: 'com', size: 3, lvl: 18, cost: { money: 60000, stone: 400, steel: 250 }, time: 900, workers: 90, inc: 1700, cust: 900, cons: { goods: 5 }, pw: 60, wt: 30, up: 150, desc: 'Büyük alışveriş merkezi. Mal tüketir.' });
  b('hotel', { name: 'Otel', cat: 'com', size: 2, lvl: 21, cost: { money: 90000, stone: 400, steel: 200, goods: 60 }, time: 1200, workers: 50, inc: 1500, cons: { food: 6, goods: 1 }, pw: 40, wt: 50, up: 130, desc: 'Turistleri ağırlar.' });
  b('bank', { name: 'Banka', cat: 'com', size: 2, lvl: 25, cost: { money: 200000, stone: 400, steel: 400 }, time: 1800, workers: 60, inc: 2900, pw: 40, wt: 15, up: 240, desc: 'Finans merkezi.' });
  b('plaza', { name: 'İş Kulesi', cat: 'com', size: 3, lvl: 32, cost: { money: 900000, steel: 3000, elec: 300 }, time: 3600, workers: 400, inc: 10500, pw: 260, wt: 110, up: 900, desc: 'Uluslararası şirketlerin merkezi.' });

  /* ---------- SANAYİ ---------- */
  b('lumber', { name: 'Oduncu Kampı', cat: 'ind', lvl: 2, cost: { money: 300 }, time: 15, workers: 4, prod: { wood: 6 }, need: 'forest', up: 3, pol: { r: 2, v: 2 }, desc: 'Kereste üretir. 3 kare içinde orman olmalı; orman çoksa üretim artar.' });
  b('farm', { name: 'Çiftlik', cat: 'ind', size: 2, lvl: 3, cost: { money: 500, wood: 20 }, time: 25, workers: 5, prod: { food: 10 }, wt: 3, up: 4, desc: 'Gıda üretir. Halk aç kalırsa mutsuz olur.' });
  b('quarry', { name: 'Taş Ocağı', cat: 'ind', size: 2, lvl: 4, cost: { money: 900, wood: 30 }, time: 40, workers: 8, prod: { stone: 5 }, need: 'rock', pw: 2, up: 8, pol: { r: 3, v: 6 }, desc: 'Taş çıkarır. 2 kare içinde kayalık olmalı.' });
  b('fishery', { name: 'Balıkçı İskelesi', cat: 'ind', lvl: 6, cost: { money: 1200, wood: 40 }, time: 40, workers: 4, prod: { food: 14 }, need: 'water', up: 6, desc: 'Gıda üretir. Suya bitişik olmalı.' });
  b('mine', { name: 'Maden Ocağı', cat: 'ind', size: 2, lvl: 9, cost: { money: 5000, wood: 80, stone: 60 }, time: 120, workers: 14, prod: { ore: 6 }, need: 'ore', pw: 8, up: 25, pol: { r: 4, v: 10 }, desc: 'Cevher çıkarır. 2 kare içinde cevher yatağı olmalı.' });
  b('steelmill', { name: 'Çelik Fabrikası', cat: 'ind', size: 2, lvl: 10, cost: { money: 8000, wood: 60, stone: 120 }, time: 200, workers: 20, cons: { ore: 6 }, prod: { steel: 3 }, pw: 20, wt: 10, up: 40, pol: { r: 5, v: 16 }, desc: 'Cevheri çeliğe dönüştürür.' });
  b('factory', { name: 'Fabrika', cat: 'ind', size: 2, lvl: 15, cost: { money: 20000, stone: 200, steel: 100 }, time: 400, workers: 35, cons: { wood: 6, steel: 2 }, prod: { goods: 4 }, pw: 30, wt: 10, up: 80, pol: { r: 5, v: 14 }, desc: 'Kereste ve çelikten tüketim malı üretir.' });
  b('greenhouse', { name: 'Modern Sera', cat: 'ind', size: 2, lvl: 17, cost: { money: 18000, stone: 100, steel: 60 }, time: 300, workers: 10, prod: { food: 42 }, pw: 10, wt: 20, up: 50, desc: 'Yüksek verimli gıda üretimi.' });
  b('techfab', { name: 'Elektronik Fabrikası', cat: 'ind', size: 3, lvl: 24, cost: { money: 150000, steel: 600, goods: 150 }, time: 1500, workers: 80, cons: { steel: 4, goods: 2 }, prod: { elec: 2 }, pw: 80, wt: 30, up: 300, pol: { r: 4, v: 8 }, desc: 'Çelik ve maldan elektronik üretir.' });

  /* ---------- ALTYAPI ---------- */
  b('wind', { name: 'Rüzgâr Türbini', cat: 'util', lvl: 1, cost: { money: 300, wood: 10 }, time: 10, pgen: 12, up: 3, noRoad: true, desc: 'Temiz ama az enerji. Yola ihtiyaç duymaz.' });
  b('watertower', { name: 'Su Kulesi', cat: 'util', lvl: 1, cost: { money: 250, wood: 8 }, time: 10, wgen: 15, up: 3, noRoad: true, desc: 'Mahalleye su sağlar. Yola ihtiyaç duymaz.' });
  b('coal', { name: 'Kömür Santrali', cat: 'util', size: 2, lvl: 7, cost: { money: 4000, wood: 50, stone: 100 }, time: 120, workers: 8, pgen: 95, up: 40, pol: { r: 6, v: 18 }, desc: 'Güçlü ama çok kirletir. Evlerden uzağa kur.' });
  b('pump', { name: 'Su Pompası', cat: 'util', lvl: 8, cost: { money: 3000, wood: 40, stone: 60 }, time: 90, workers: 2, wgen: 100, pw: 4, up: 20, need: 'water', desc: 'Suya bitişik kurulur, bol su sağlar.' });
  b('solar', { name: 'Güneş Tarlası', cat: 'util', size: 2, lvl: 14, cost: { money: 15000, steel: 80 }, time: 240, pgen: 130, up: 25, tech: 'gunes', noRoad: true, desc: 'Temiz enerji. Araştırma gerektirir.' });
  b('treatment', { name: 'Arıtma Tesisi', cat: 'util', size: 2, lvl: 19, cost: { money: 40000, stone: 300, steel: 150 }, time: 600, workers: 10, wgen: 520, pw: 20, up: 90, desc: 'Büyük şehirler için su arıtma.' });
  b('nuclear', { name: 'Nükleer Santral', cat: 'util', size: 3, lvl: 27, cost: { money: 500000, stone: 2000, steel: 2000, elec: 150 }, time: 3600, workers: 60, pgen: 1600, wt: 80, up: 600, tech: 'nukleer', desc: 'Devasa temiz enerji. Araştırma gerektirir.' });
  b('fusion', { name: 'Füzyon Reaktörü', cat: 'util', size: 3, lvl: 36, cost: { money: 3000000, steel: 6000, elec: 1500 }, time: 10800, workers: 80, pgen: 6500, wt: 100, up: 1500, tech: 'fuzyon', desc: 'Sınırsıza yakın enerji.' });

  /* ---------- HİZMET ---------- */
  b('police', { name: 'Karakol', cat: 'svc', lvl: 4, cost: { money: 1200, wood: 30, stone: 30 }, time: 45, workers: 6, up: 25, pw: 2, svc: { t: 'police', r: 7, v: 0.7 }, desc: 'Çevresindeki suçu önler, mutluluğu artırır.' });
  b('fire', { name: 'İtfaiye', cat: 'svc', lvl: 4, cost: { money: 1200, wood: 30, stone: 30 }, time: 45, workers: 6, up: 25, wt: 3, svc: { t: 'fire', r: 7, v: 0.7 }, desc: 'Çevresindeki yangınları hasarsız söndürür.' });
  b('clinic', { name: 'Sağlık Ocağı', cat: 'svc', lvl: 5, cost: { money: 1500, wood: 30, stone: 40 }, time: 50, workers: 6, up: 30, pw: 2, wt: 2, svc: { t: 'health', r: 7, v: 0.6 }, desc: 'Temel sağlık hizmeti.' });
  b('school', { name: 'İlkokul', cat: 'svc', size: 2, lvl: 5, cost: { money: 2500, wood: 60, stone: 40 }, time: 80, workers: 10, up: 40, pw: 3, wt: 3, svc: { t: 'edu', r: 8, v: 0.5 }, sci: 1, desc: 'Eğitim sağlar ve bilim puanı üretir.' });
  b('library', { name: 'Kütüphane', cat: 'svc', lvl: 9, cost: { money: 4000, wood: 80, stone: 60 }, time: 120, workers: 4, up: 30, pw: 2, svc: { t: 'leisure', r: 5, v: 3 }, sci: 1.5, desc: 'Bilim puanı üretir, çevreye huzur verir.' });
  b('highschool', { name: 'Lise', cat: 'svc', size: 2, lvl: 12, cost: { money: 12000, stone: 200, steel: 30 }, time: 300, workers: 20, up: 100, pw: 8, wt: 6, svc: { t: 'edu', r: 12, v: 0.75 }, sci: 3, desc: 'Geniş alana kaliteli eğitim.' });
  b('hospital', { name: 'Hastane', cat: 'svc', size: 3, lvl: 16, cost: { money: 45000, stone: 400, steel: 200 }, time: 720, workers: 60, up: 300, pw: 40, wt: 40, svc: { t: 'health', r: 16, v: 1 }, desc: 'Tam teşekküllü sağlık hizmeti.' });
  b('policehq', { name: 'Emniyet Müdürlüğü', cat: 'svc', size: 2, lvl: 20, cost: { money: 60000, stone: 400, steel: 250 }, time: 800, workers: 40, up: 260, pw: 20, svc: { t: 'police', r: 16, v: 1 }, desc: 'Geniş alanda tam güvenlik.' });
  b('firehq', { name: 'İtfaiye Merkezi', cat: 'svc', size: 2, lvl: 20, cost: { money: 60000, stone: 400, steel: 250 }, time: 800, workers: 40, up: 260, wt: 30, svc: { t: 'fire', r: 16, v: 1 }, desc: 'Geniş alanda yangın koruması.' });
  b('university', { name: 'Üniversite', cat: 'svc', size: 3, lvl: 23, cost: { money: 180000, stone: 800, steel: 400, goods: 80 }, time: 1800, workers: 80, up: 500, pw: 50, wt: 40, svc: { t: 'edu', r: 20, v: 1 }, sci: 12, desc: 'En üst düzey eğitim ve bol bilim.' });
  b('lab', { name: 'Araştırma Merkezi', cat: 'svc', size: 2, lvl: 26, cost: { money: 250000, steel: 500, elec: 100 }, time: 2400, workers: 50, up: 600, pw: 80, wt: 20, sci: 25, desc: 'Yoğun bilim puanı üretir.' });

  /* ---------- PARK ---------- */
  b('tree', { name: 'Ağaç Dik', cat: 'park', tool: true, lvl: 1, cost: { money: 20 }, desc: 'Çimene ağaç diker. Oduncu kampları için orman oluşturabilirsin.' });
  b('park', { name: 'Park', cat: 'park', lvl: 3, cost: { money: 200, wood: 5 }, time: 8, up: 2, noRoad: true, svc: { t: 'leisure', r: 3, v: 4 }, desc: 'Çevredeki evlerin mutluluğunu artırır.' });
  b('fountain', { name: 'Süs Havuzu', cat: 'park', lvl: 6, cost: { money: 800, stone: 30 }, time: 20, up: 4, wt: 2, noRoad: true, svc: { t: 'leisure', r: 4, v: 5 }, desc: 'Şık bir süs havuzu.' });
  b('playground', { name: 'Oyun Parkı', cat: 'park', lvl: 8, cost: { money: 1500, wood: 40 }, time: 30, up: 6, noRoad: true, svc: { t: 'leisure', r: 4, v: 6 }, desc: 'Çocuklar için oyun alanı.' });
  b('garden', { name: 'Botanik Bahçe', cat: 'park', size: 2, lvl: 11, cost: { money: 6000, wood: 80, stone: 40 }, time: 120, up: 15, wt: 6, noRoad: true, svc: { t: 'leisure', r: 6, v: 8 }, desc: 'Geniş yeşil alan.' });
  b('square', { name: 'Kent Meydanı', cat: 'park', size: 2, lvl: 14, cost: { money: 12000, stone: 250 }, time: 200, up: 20, svc: { t: 'leisure', r: 7, v: 9 }, desc: 'Şehrin buluşma noktası.' });
  b('cinema', { name: 'Sinema', cat: 'park', size: 2, lvl: 17, cost: { money: 30000, stone: 250, steel: 80 }, time: 500, workers: 12, up: 50, pw: 15, inc: 180, svc: { t: 'leisure', r: 9, v: 10 }, desc: 'Eğlence ve biraz da gelir.' });
  b('museum', { name: 'Müze', cat: 'park', size: 2, lvl: 22, cost: { money: 90000, stone: 600, steel: 150 }, time: 1200, workers: 15, up: 110, pw: 15, sci: 3, svc: { t: 'leisure', r: 10, v: 10 }, desc: 'Kültür, mutluluk ve bilim.' });
  b('amusement', { name: 'Lunapark', cat: 'park', size: 3, lvl: 26, cost: { money: 220000, steel: 700, goods: 150 }, time: 2400, workers: 40, up: 280, pw: 70, inc: 700, svc: { t: 'leisure', r: 13, v: 14 }, desc: 'Dönme dolaplı dev eğlence parkı.' });
  b('stadium', { name: 'Stadyum', cat: 'park', size: 4, lvl: 31, cost: { money: 800000, stone: 3000, steel: 2000 }, time: 4800, workers: 80, up: 700, pw: 120, wt: 60, inc: 2200, svc: { t: 'leisure', r: 20, v: 16 }, desc: 'On binlerce taraftarı ağırlar.' });

  /* ---------- ÖZEL ---------- */
  b('townhall', { name: 'Belediye', cat: 'spec', size: 2, lvl: 1, unique: true, hidden: true, noRoad: true, desc: 'Şehrin kalbi. Yükselterek yeni çağlara geç.' });
  b('depot', { name: 'Depo', cat: 'spec', lvl: 2, cost: { money: 400, wood: 20 }, time: 20, up: 3, stor: 250, desc: 'Her kaynak için depo kapasitesini artırır.' });
  b('bazaar', { name: 'Pazar Yeri', cat: 'spec', size: 2, lvl: 6, cost: { money: 2000, wood: 80 }, time: 60, workers: 6, up: 10, max: 1, desc: 'Kaynak alıp satmanı sağlar (Ticaret menüsü).' });
  b('builder', { name: 'İnşaat Şirketi', cat: 'spec', size: 2, lvl: 9, cost: { money: 8000, wood: 150, stone: 150 }, time: 240, workers: 12, up: 40, max: 2, crew: 1, desc: 'Aynı anda bir inşaat daha yapabilirsin (+1 ekip).' });
  b('warehouse', { name: 'Büyük Depo', cat: 'spec', size: 2, lvl: 12, cost: { money: 8000, stone: 200, steel: 20 }, time: 200, workers: 6, up: 20, stor: 1500, desc: 'Çok büyük depolama alanı.' });
  b('port', { name: 'Liman', cat: 'spec', size: 3, lvl: 15, cost: { money: 50000, wood: 300, stone: 300, steel: 100 }, time: 900, workers: 40, up: 150, max: 1, need: 'water', glob: { contract: 0.25 }, slots: 2, desc: '+2 sözleşme, %25 daha kârlı sözleşmeler, daha iyi pazar fiyatları. Suya bitişik olmalı.' });
  b('airport', { name: 'Havalimanı', cat: 'spec', size: 4, lvl: 28, cost: { money: 600000, stone: 2500, steel: 2000, elec: 200 }, time: 3600, workers: 120, up: 700, inc: 3500, max: 1, glob: { contract: 0.4 }, slots: 2, pw: 150, pol: { r: 5, v: 8 }, desc: '+2 sözleşme, çok daha kârlı ticaret ve turizm geliri.' });

  /* ---------- ANITLAR ---------- */
  b('clocktower', { name: 'Saat Kulesi', cat: 'wonder', lvl: 10, cost: { money: 40000, stone: 600, steel: 80 }, time: 1800, max: 1, up: 30, noRoad: true, glob: { happy: 3 }, svc: { t: 'leisure', r: 10, v: 6 }, desc: 'Tüm şehre +3 mutluluk (seviye başına).' });
  b('lighthouse', { name: 'Deniz Feneri', cat: 'wonder', lvl: 14, cost: { money: 100000, stone: 1200, steel: 200 }, time: 3000, max: 1, up: 50, need: 'water', noRoad: true, glob: { contract: 0.15 }, desc: 'Sözleşme ödülleri +%15 (seviye başına). Suya bitişik olmalı.' });
  b('grandlibrary', { name: 'Büyük Kütüphane', cat: 'wonder', size: 3, lvl: 20, cost: { money: 350000, wood: 2000, stone: 2500, steel: 400 }, time: 5400, max: 1, up: 150, sci: 20, glob: { sci: 0.15 }, desc: 'Bilim üretimi +%15 (seviye başına) ve +20 bilim.' });
  b('opera', { name: 'Opera Binası', cat: 'wonder', size: 3, lvl: 25, cost: { money: 700000, stone: 4000, steel: 1500, goods: 500 }, time: 7200, max: 1, up: 250, glob: { happy: 4 }, svc: { t: 'leisure', r: 16, v: 10 }, desc: 'Tüm şehre +4 mutluluk (seviye başına).' });
  b('tvtower', { name: 'Gözlem Kulesi', cat: 'wonder', size: 2, lvl: 30, cost: { money: 1500000, steel: 5000, elec: 400 }, time: 10800, max: 1, up: 400, glob: { com: 0.12 }, desc: 'Ticaret geliri +%12 (seviye başına).' });
  b('monument', { name: 'Zafer Anıtı', cat: 'wonder', size: 2, lvl: 34, cost: { money: 3000000, stone: 12000, steel: 4000 }, time: 14400, max: 1, up: 500, noRoad: true, glob: { tax: 0.08 }, desc: 'Vergi geliri +%8 (seviye başına).' });
  b('spaceport', { name: 'Uzay Üssü', cat: 'wonder', size: 4, lvl: 40, cost: { money: 15000000, steel: 20000, goods: 5000, elec: 5000 }, time: 21600, max: 1, up: 3000, sci: 100, tech: 'uzay', glob: { happy: 5, sci: 0.2 }, desc: 'İnsanlığın yıldızlara açılan kapısı. Nihai hedef!' });

  /* ---------- BELEDİYE SEVİYELERİ ---------- */
  D.TH = [
    null,
    { name: 'Köy', crews: 2, regions: 6, stor: 300, tax: 0 },
    { name: 'Kasaba', need: 5, cost: { money: 3000, wood: 100, stone: 80 }, time: 120, crews: 2, regions: 10, stor: 500, tax: 0.03 },
    { name: 'İlçe', need: 9, cost: { money: 15000, wood: 300, stone: 300 }, time: 600, crews: 3, regions: 16, stor: 900, tax: 0.06 },
    { name: 'Şehir', need: 14, cost: { money: 60000, stone: 800, steel: 200 }, time: 1800, crews: 3, regions: 24, stor: 1600, tax: 0.09 },
    { name: 'Büyükşehir', need: 19, cost: { money: 200000, stone: 1500, steel: 800, goods: 200 }, time: 3600, crews: 4, regions: 32, stor: 3000, tax: 0.12 },
    { name: 'Metropol', need: 24, cost: { money: 600000, steel: 2500, goods: 800, elec: 100 }, time: 7200, crews: 4, regions: 40, stor: 5000, tax: 0.15 },
    { name: 'Megakent', need: 29, cost: { money: 1800000, steel: 6000, goods: 2000, elec: 500 }, time: 10800, crews: 5, regions: 48, stor: 8000, tax: 0.18 },
    { name: 'Dev Metropol', need: 34, cost: { money: 5000000, steel: 12000, goods: 4000, elec: 1500 }, time: 14400, crews: 5, regions: 56, stor: 12000, tax: 0.21 },
    { name: 'Dünya Kenti', need: 38, cost: { money: 12000000, steel: 20000, goods: 8000, elec: 3000 }, time: 21600, crews: 6, regions: 64, stor: 18000, tax: 0.24 },
    { name: 'Efsane Başkent', need: 42, cost: { money: 30000000, steel: 40000, goods: 15000, elec: 8000 }, time: 28800, crews: 6, regions: 64, stor: 30000, tax: 0.3 }
  ];

  /* ---------- ARAŞTIRMALAR ---------- */
  D.TECH = {};
  D.TECH_ORDER = [];
  function t(id, tier, name, cost, eff, desc, req) {
    D.TECH[id] = { id: id, tier: tier, name: name, cost: cost, eff: eff, desc: desc, req: req || null };
    D.TECH_ORDER.push(id);
  }
  t('tarim', 1, 'Modern Tarım', 30, { food: 0.25 }, 'Gıda üretimi +%25');
  t('orman', 1, 'Sürdürülebilir Orman', 30, { wood: 0.25 }, 'Kereste üretimi +%25');
  t('vergi1', 1, 'Vergi Dairesi', 60, { tax: 0.08 }, 'Vergi geliri +%8');
  t('insaat1', 1, 'İskele Tekniği', 60, { build: 0.15 }, 'İnşaat süresi -%15');
  t('depo1', 1, 'Lojistik', 80, { stor: 0.5 }, 'Depo kapasitesi +%50');
  t('maden', 2, 'Maden Mühendisliği', 220, { mineral: 0.25 }, 'Taş ve cevher üretimi +%25', 'orman');
  t('ticaret1', 2, 'Pazarlama', 260, { com: 0.1 }, 'Ticaret geliri +%10', 'vergi1');
  t('hizmet', 2, 'Kamu Yönetimi', 300, { radius: 0.15 }, 'Hizmet binalarının menzili +%15');
  t('gunes', 2, 'Güneş Enerjisi', 350, { unlock: 'solar' }, 'Güneş Tarlası binasını açar');
  t('cevre', 2, 'Çevre Bilinci', 400, { pollution: 0.25 }, 'Kirlilik -%25');
  t('insaat2', 2, 'Prefabrik Yapı', 500, { build: 0.15 }, 'İnşaat süresi -%15 daha', 'insaat1');
  t('celik', 3, 'Yüksek Fırın', 1400, { steel: 0.25 }, 'Çelik üretimi +%25', 'maden');
  t('egitim', 3, 'Eğitim Reformu', 1800, { sci: 0.25 }, 'Bilim üretimi +%25');
  t('otomasyon', 3, 'Otomasyon', 2400, { fab: 0.25 }, 'Mal ve elektronik üretimi +%25');
  t('vergi2', 3, 'Dijital Vergi', 2400, { tax: 0.1 }, 'Vergi geliri +%10', 'vergi1');
  t('gece', 3, 'Gece Vardiyası', 3000, { offline: 0.3 }, 'Oyun kapalıyken verim %50 → %80', 'depo1');
  t('bakim', 3, 'Akıllı Bakım', 3800, { upkeep: 0.15 }, 'Bina bakım giderleri -%15');
  t('turizm', 3, 'Turizm', 4800, { com: 0.15 }, 'Ticaret geliri +%15', 'ticaret1');
  t('nukleer', 4, 'Nükleer Enerji', 12000, { unlock: 'nuclear' }, 'Nükleer Santral binasını açar', 'gunes');
  t('sebeke', 4, 'Akıllı Şebeke', 15000, { util: 0.2 }, 'Enerji ve su üretimi +%20');
  t('insaat3', 4, 'Modüler İnşaat', 20000, { build: 0.2 }, 'İnşaat süresi -%20 daha', 'insaat2');
  t('sosyal', 4, 'Sosyal Devlet', 25000, { happy: 5 }, 'Şehir mutluluğu +5');
  t('yuksek', 4, 'Yüksek Yapı Tekniği', 30000, { cap: 0.1 }, 'Konut kapasitesi +%10');
  t('depo2', 4, 'Otomatik Depo', 35000, { stor: 0.5 }, 'Depo kapasitesi +%50 daha', 'depo1');
  t('fuzyon', 5, 'Füzyon Enerjisi', 80000, { unlock: 'fusion' }, 'Füzyon Reaktörü binasını açar', 'nukleer');
  t('uzay', 5, 'Uzay Programı', 150000, { unlock: 'spaceport' }, 'Uzay Üssü anıtını açar', 'egitim');

  /* ---------- GÖREVLER ---------- */
  var M = D.MISSIONS = [];
  function m(title, hint, goal, rew) { M.push({ title: title, hint: hint, goal: goal, rew: rew }); }
  m('İlk Yollar', 'İnşa > Yol ile 6 kare yol çiz. Yollar belediyeye bağlı olmalı.', { t: 'road', n: 6 }, { money: 200, xp: 15 });
  m('İlk Sakinler', 'Yol kenarına 4 Kulübe kur.', { t: 'b', id: 'hut', n: 4 }, { money: 300, xp: 20 });
  m('Elektrik!', 'Altyapı sekmesinden bir Rüzgâr Türbini kur.', { t: 'b', id: 'wind', n: 1 }, { money: 300, xp: 20 });
  m('Temiz Su', 'Bir Su Kulesi kur. Su ve elektrik olmadan kimse taşınmaz.', { t: 'b', id: 'watertower', n: 1 }, { money: 300, xp: 20 });
  m('Küçük Köy', 'Nüfusu 20 kişiye çıkar.', { t: 'pop', n: 20 }, { money: 400, xp: 30 });
  m('Kereste Lazım', 'Ormana yakın bir Oduncu Kampı kur.', { t: 'b', id: 'lumber', n: 1 }, { money: 200, wood: 50, xp: 30 });
  m('Mahalle Bakkalı', 'Bir Bakkal aç; halk iş ve alışveriş ister.', { t: 'b', id: 'shop', n: 1 }, { money: 500, xp: 30 });
  m('Tarla Zamanı', 'Bir Çiftlik kur; şehir gıdasız kalmasın.', { t: 'b', id: 'farm', n: 1 }, { money: 300, food: 100, xp: 40 });
  m('İlk Depo', 'Bir Depo kur ve kapasiteni artır.', { t: 'b', id: 'depot', n: 1 }, { money: 400, xp: 40 });
  m('Büyüyen Köy', 'Nüfusu 60 kişiye çıkar.', { t: 'pop', n: 60 }, { money: 800, xp: 60 });
  m('Yeşil Alan', '2 Park kur; yakındaki evler daha mutlu olur.', { t: 'b', id: 'park', n: 2 }, { money: 500, xp: 50 });
  m('Gerçek Evler', '5 Ev inşa et.', { t: 'b', id: 'house', n: 5 }, { money: 1000, xp: 80 });
  m('Taş Ocağı', 'Kayalıkların yanına bir Taş Ocağı kur.', { t: 'b', id: 'quarry', n: 1 }, { money: 800, stone: 60, xp: 80 });
  m('Güvenlik', 'Bir Karakol kur.', { t: 'b', id: 'police', n: 1 }, { money: 1000, xp: 90 });
  m('Yangına Karşı', 'Bir İtfaiye kur; yangınlar binaları hasara uğratır.', { t: 'b', id: 'fire', n: 1 }, { money: 1000, xp: 90 });
  m('Kasaba Oluyoruz', 'Belediyeye dokun ve onu 2. seviyeye yükselt.', { t: 'th', n: 2 }, { money: 2000, xp: 150 });
  m('Yeni Topraklar', 'Genişle düğmesiyle 2 yeni bölge satın al.', { t: 'reg', n: 6 }, { money: 1500, xp: 120 });
  m('Sağlık', 'Bir Sağlık Ocağı kur.', { t: 'b', id: 'clinic', n: 1 }, { money: 1200, xp: 100 });
  m('Okul Zili', 'Bir İlkokul kur; bilim puanı üretmeye başlar.', { t: 'b', id: 'school', n: 1 }, { money: 1500, xp: 120 });
  m('İlk Buluş', 'Araştırma menüsünden bir teknoloji tamamla.', { t: 'tech', n: 1 }, { money: 1500, xp: 150 });
  m('Nüfus 250', 'Nüfusu 250 kişiye çıkar.', { t: 'pop', n: 250 }, { money: 3000, xp: 200 });
  m('Market', 'Bir Market aç.', { t: 'b', id: 'market', n: 1 }, { money: 2000, xp: 150 });
  m('Pazar Yeri', 'Bir Pazar Yeri kur ve kaynak ticaretine başla.', { t: 'b', id: 'bazaar', n: 1 }, { money: 2000, xp: 180 });
  m('İlk Sözleşme', 'Ticaret menüsünden bir sözleşmeyi teslim et.', { t: 'con', n: 1 }, { money: 2500, xp: 200 });
  m('Mutlu Halk', 'Şehir mutluluğunu %70\'e çıkar.', { t: 'happy', n: 70 }, { money: 3000, xp: 220 });
  m('Enerji Devrimi', 'Bir Kömür Santrali kur (evlerden uzağa!).', { t: 'b', id: 'coal', n: 1 }, { money: 3000, xp: 250 });
  m('Sıra Evler', '4 Sıra Ev inşa et.', { t: 'b', id: 'townhouse', n: 4 }, { money: 4000, xp: 300 });
  m('Güçlendirme', '3 binayı yükselt (binaya dokun > Yükselt).', { t: 'upg', n: 3 }, { money: 4000, xp: 300 });
  m('Nüfus 800', 'Nüfusu 800 kişiye çıkar.', { t: 'pop', n: 800 }, { money: 8000, xp: 450 });
  m('İlçe', 'Belediyeyi 3. seviyeye yükselt.', { t: 'th', n: 3 }, { money: 8000, xp: 500 });
  m('Madenciler', 'Cevher yatağının yanına Maden Ocağı kur.', { t: 'b', id: 'mine', n: 1 }, { money: 6000, xp: 450 });
  m('Çelik Çağı', 'Bir Çelik Fabrikası kur.', { t: 'b', id: 'steelmill', n: 1 }, { money: 8000, steel: 40, xp: 550 });
  m('Apartmanlar', '4 Apartman inşa et.', { t: 'b', id: 'apartment', n: 4 }, { money: 15000, xp: 700 });
  m('Bilim Yolu', '5 teknoloji araştır.', { t: 'tech', n: 5 }, { money: 12000, xp: 800 });
  m('Nüfus 2.500', 'Nüfusu 2.500 kişiye çıkar.', { t: 'pop', n: 2500 }, { money: 25000, xp: 1200 });
  m('Ofis Hayatı', '2 Ofis inşa et.', { t: 'b', id: 'office', n: 2 }, { money: 20000, xp: 1000 });
  m('Genişleme', 'Toplam 14 bölgeye sahip ol.', { t: 'reg', n: 14 }, { money: 25000, xp: 1200 });
  m('Sanayi Hamlesi', '2 Fabrika kur.', { t: 'b', id: 'factory', n: 2 }, { money: 30000, goods: 60, xp: 1500 });
  m('Şehir', 'Belediyeyi 4. seviyeye yükselt.', { t: 'th', n: 4 }, { money: 40000, xp: 2000 });
  m('Saat Kulesi', 'İlk anıtın olan Saat Kulesi\'ni inşa et.', { t: 'b', id: 'clocktower', n: 1 }, { money: 30000, xp: 2000 });
  m('Liman', 'Suya bitişik bir Liman kur.', { t: 'b', id: 'port', n: 1 }, { money: 50000, xp: 2500 });
  m('Tüccar', 'Toplam 15 sözleşme teslim et.', { t: 'con', n: 15 }, { money: 60000, xp: 3000 });
  m('Nüfus 8.000', 'Nüfusu 8.000 kişiye çıkar.', { t: 'pop', n: 8000 }, { money: 90000, xp: 4000 });
  m('Hastane', 'Bir Hastane inşa et.', { t: 'b', id: 'hospital', n: 1 }, { money: 60000, xp: 3500 });
  m('AVM', 'Bir AVM inşa et.', { t: 'b', id: 'mall', n: 1 }, { money: 80000, xp: 4000 });
  m('Büyükşehir', 'Belediyeyi 5. seviyeye yükselt.', { t: 'th', n: 5 }, { money: 150000, xp: 6000 });
  m('Bilge Şehir', '12 teknoloji araştır.', { t: 'tech', n: 12 }, { money: 150000, xp: 6000 });
  m('Nüfus 20.000', 'Nüfusu 20.000 kişiye çıkar.', { t: 'pop', n: 20000 }, { money: 300000, xp: 9000 });
  m('Üniversite', 'Bir Üniversite inşa et.', { t: 'b', id: 'university', n: 1 }, { money: 200000, xp: 8000 });
  m('Elektronik Çağı', 'Bir Elektronik Fabrikası kur.', { t: 'b', id: 'techfab', n: 1 }, { money: 250000, elec: 50, xp: 9000 });
  m('Metropol', 'Belediyeyi 6. seviyeye yükselt.', { t: 'th', n: 6 }, { money: 500000, xp: 14000 });
  m('Atom Çağı', 'Bir Nükleer Santral inşa et.', { t: 'b', id: 'nuclear', n: 1 }, { money: 500000, xp: 15000 });
  m('Gökdelenler', '3 Gökdelen inşa et.', { t: 'b', id: 'skyscraper', n: 3 }, { money: 900000, xp: 22000 });
  m('Nüfus 50.000', 'Nüfusu 50.000 kişiye çıkar.', { t: 'pop', n: 50000 }, { money: 1500000, xp: 30000 });
  m('Havalimanı', 'Bir Havalimanı inşa et.', { t: 'b', id: 'airport', n: 1 }, { money: 1200000, xp: 30000 });
  m('Megakent', 'Belediyeyi 8. seviyeye yükselt.', { t: 'th', n: 8 }, { money: 3000000, xp: 50000 });
  m('Anıtlar Şehri', '4 farklı anıt inşa et.', { t: 'wonder', n: 4 }, { money: 4000000, xp: 60000 });
  m('Nüfus 100.000', 'Nüfusu 100.000 kişiye çıkar.', { t: 'pop', n: 100000 }, { money: 8000000, xp: 90000 });
  m('Tüm Harita', '64 bölgenin tamamına sahip ol.', { t: 'reg', n: 64 }, { money: 10000000, xp: 100000 });
  m('Yıldızlara Doğru', 'Uzay Üssü\'nü inşa et!', { t: 'b', id: 'spaceport', n: 1 }, { money: 25000000, xp: 200000 });

  // ilk görevlerde ödül cömert olsun: oyunun başı akıcı ilerlesin
  for (var mi = 0; mi < 12; mi++) M[mi].rew.money *= 2;

  /* ---------- BAŞARIMLAR ---------- */
  var A = D.ACH = [];
  function a(id, name, desc, stat, n, xp) { A.push({ id: id, name: name, desc: desc, stat: stat, n: n, xp: xp }); }
  [[100, 'Köy Muhtarı'], [1000, 'Kasaba Başkanı'], [10000, 'Şehir Başkanı'], [50000, 'Büyükşehir Başkanı'], [100000, 'Efsane Başkan'], [200000, 'Megakent Mimarı']].forEach(function (p, i) {
    a('pop' + i, p[1], 'Nüfus ' + CB.fmt(p[0]) + ' olsun', 'pop', p[0], 50 * Math.pow(5, i));
  });
  [[10, 'Acemi Usta'], [50, 'Kalfa'], [200, 'Usta'], [600, 'Başmimar'], [1500, 'Koca Sinan']].forEach(function (p, i) {
    a('built' + i, p[1], p[0] + ' bina inşa et', 'built', p[0], 40 * Math.pow(4, i));
  });
  [[10000, 'İlk Birikim'], [1e6, 'Milyoner'], [1e8, 'Hazine'], [1e9, 'Milyarder']].forEach(function (p, i) {
    a('earn' + i, p[1], 'Toplam ₺' + CB.fmt(p[0]) + ' kazan', 'earned', p[0], 80 * Math.pow(6, i));
  });
  [[50, 'Yol İşçisi'], [300, 'Karayolları'], [800, 'Otoyol Kralı']].forEach(function (p, i) {
    a('road' + i, p[1], p[0] + ' kare yol döşe', 'roads', p[0], 50 * Math.pow(5, i));
  });
  [[5, 'Çırak Tüccar'], [40, 'Tüccar'], [150, 'Ticaret Baronu']].forEach(function (p, i) {
    a('con' + i, p[1], p[0] + ' sözleşme teslim et', 'contracts', p[0], 100 * Math.pow(6, i));
  });
  [[3, 'Meraklı'], [12, 'Bilgin'], [26, 'Dahi']].forEach(function (p, i) {
    a('tech' + i, p[1], p[0] + ' teknoloji araştır', 'techs', p[0], 150 * Math.pow(7, i));
  });
  [[10, 'Tamirci'], [60, 'Yenilikçi'], [250, 'Mükemmeliyetçi']].forEach(function (p, i) {
    a('upg' + i, p[1], p[0] + ' bina yükselt', 'upgrades', p[0], 100 * Math.pow(6, i));
  });
  [[12, 'Kâşif'], [32, 'Fatih'], [64, 'Hükümdar']].forEach(function (p, i) {
    a('reg' + i, p[1], p[0] + ' bölgeye sahip ol', 'regions', p[0], 200 * Math.pow(6, i));
  });
  a('happy0', 'Mutlu Şehir', 'Nüfus 500+ iken mutluluk %85 olsun', 'happy500', 85, 800);
  a('happy1', 'Cennet Şehir', 'Nüfus 10.000+ iken mutluluk %92 olsun', 'happy10k', 92, 8000);
  [[1, 'Anıt Sahibi'], [4, 'Kültür Başkenti'], [7, 'Yedi Harika']].forEach(function (p, i) {
    a('won' + i, p[1], p[0] + ' anıt inşa et', 'wonders', p[0], 1500 * Math.pow(6, i));
  });
  [[3, 'Sadık Başkan'], [7, 'Bir Hafta'], [30, 'Bir Ay']].forEach(function (p, i) {
    a('streak' + i, p[1], p[0] + ' gün üst üste giriş yap', 'streak', p[0], 300 * Math.pow(5, i));
  });
  a('fire0', 'Kahraman İtfaiye', '10 yangını hasarsız söndür', 'firesOut', 10, 500);
  a('park0', 'Yeşil Başkan', '40 park / eğlence alanı kur', 'parks', 40, 1500);

  /* ---------- OLAYLAR ---------- */
  D.EVENTS = [
    { id: 'investor', icon: '💼', name: 'Yatırımcı Ziyareti', text: 'Bir yatırımcı şehrini çok beğendi ve bağışta bulundu.', gift: 'money' },
    { id: 'donation', icon: '🎁', name: 'Yardım Konvoyu', text: 'Komşu şehirden malzeme yardımı geldi.', gift: 'res' },
    { id: 'grant', icon: '🎓', name: 'Bilim Hibesi', text: 'Bilim vakfı araştırmalarına destek verdi.', gift: 'sci', minLvl: 5 },
    { id: 'festival', icon: '🎉', name: 'Festival Talebi', text: 'Halk bir şenlik düzenlemeni istiyor. Mutluluk 10 dakika boyunca +8 olur.', choice: 'festival', minPop: 40 },
    { id: 'boom', icon: '📈', name: 'Ekonomik Canlanma', text: 'Piyasalar hareketlendi! Ticaret geliri 5 dakika boyunca +%30.', eff: { com: 0.3 }, dur: 300, minLvl: 3 },
    { id: 'storm', icon: '🌩️', name: 'Fırtına', text: 'Şiddetli fırtına enerji hatlarını etkiledi. Enerji üretimi 3 dakika boyunca -%25.', eff: { util: -0.25 }, dur: 180, minLvl: 4, bad: true },
    { id: 'drought', icon: '☀️', name: 'Kuraklık', text: 'Yağmur yağmıyor. Gıda üretimi 4 dakika boyunca -%40.', eff: { food: -0.4 }, dur: 240, minLvl: 5, bad: true },
    { id: 'harvest', icon: '🌾', name: 'Bereketli Hasat', text: 'Bu sezon ürün çok bereketli! Gıda üretimi 5 dakika boyunca +%50.', eff: { food: 0.5 }, dur: 300, minLvl: 3 },
    { id: 'migration', icon: '🧳', name: 'Göç Dalgası', text: 'Şehrinin ünü yayıldı; yeni aileler geliyor. Mutluluk 5 dakika boyunca +5.', eff: { happy: 5 }, dur: 300, minPop: 100 },
    { id: 'protest', icon: '📢', name: 'Vergi Protestosu', text: 'Yüksek vergiler halkı sokağa döktü! Mutluluk 5 dakika boyunca -8.', eff: { happy: -8 }, dur: 300, cond: 'hightax', bad: true },
    { id: 'theft', icon: '🦹', name: 'Hırsızlık Dalgası', text: 'Polis yetersiz! Hırsızlar kasadan para çaldı.', cond: 'lowpolice', loss: 'money', bad: true },
    { id: 'flu', icon: '🤒', name: 'Salgın', text: 'Sağlık hizmeti yetersiz; salgın yayıldı. Mutluluk 5 dakika boyunca -6.', eff: { happy: -6 }, dur: 300, cond: 'lowhealth', bad: true },
    { id: 'tourists', icon: '📸', name: 'Turist Kafilesi', text: 'Turistler şehrini gezdi ve bol bol alışveriş yaptı.', gift: 'money', cond: 'leisure' },
    { id: 'builders', icon: '👷', name: 'Usta Ekip', text: 'Gönüllü ustalar yardıma geldi! İnşaatlar 5 dakika boyunca %30 hızlı.', eff: { build: 0.3 }, dur: 300, minLvl: 4 }
  ];

  /* seviye için gereken XP */
  D.xpNeed = function (lvl) { return Math.round(60 * Math.pow(lvl, 2.1)); };
  D.MAX_LVL = 60;

  /* bina maliyet/seviye yardımcıları */
  D.costAt = function (def, lvl) { // lvl: hedef seviye (1 = ilk inşa)
    var k = D.UPC[lvl - 1] || 1, o = {};
    for (var r in def.cost) o[r] = Math.round(def.cost[r] * k);
    return o;
  };
  D.unlocksAt = function (lvl) {
    return D.ORDER.filter(function (id) { return D.B[id].lvl === lvl && !D.B[id].hidden; });
  };
})();
