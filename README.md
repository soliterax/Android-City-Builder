# Kent Ustası 🏙️

Android için izometrik (2.5D) şehir kurma oyunu. Küçük bir köyle başla; yollar çiz,
konut, ticaret ve sanayi kur, halkını mutlu et, çağ atla ve en sonunda **Uzay Üssü**'nü inşa et.

Oyun tamamen çevrimdışı çalışır, internet izni istemez, reklam ve uygulama içi satın alma içermez.
Tüm grafikler kod ile çizilir (harici görsel dosyası yok), APK yaklaşık 100 KB'tır.

## Özellikler

- **2.5D izometrik harita**: 64×64 karelik, her oyunda farklı üretilen arazi (orman, su, kumsal, kayalık, cevher yatağı)
- **72 yapı**: 9 konut tipi, ticaret, sanayi, altyapı, hizmet, park/eğlence, özel binalar ve 7 anıt
- **Derin ekonomi**: vergi, nüfus, iş gücü, elektrik, su, 7 kaynak (gıda, kereste, taş, cevher, çelik, mal, elektronik) ve üretim zincirleri
- **Mutluluk sistemi**: polis, itfaiye, sağlık, eğitim ve eğlence kapsaması; kirlilik, vergi, işsizlik, açlık
- **Uzun soluklu ilerleme**: 60 şehir seviyesi, 10 belediye çağı (Köy → Efsane Başkent), 64 satın alınabilir bölge,
  26 teknoloji, 3 kademeli bina yükseltmeleri, saatler süren anıt inşaatları
- **60 ana görev**, her gün yenilenen **günlük görevler**, **giriş serisi ödülleri**, **40 başarım**
- **Ticaret**: süreli sözleşmeler, fiyatı dalgalanan pazar, liman ve havalimanı
- **Olaylar**: yangın, fırtına, kuraklık, festival, yatırımcı ziyareti, salgın...
- **Çevrimdışı ilerleme**: oyun kapalıyken şehir çalışmaya devam eder (8 saate kadar, araştırmayla 12)
- **Canlı şehir**: yollarda araçlar, dönen rüzgâr türbinleri, fabrika dumanı, gece/gündüz döngüsü ve ışıklanan pencereler
- **Harita katmanları**: mutluluk, kirlilik ve hizmet kapsama haritaları
- Dikey ve yatay ekran desteği, otomatik kayıt, kayıt kodu ile yedekleme / cihaz değiştirme

## Kurulum (telefon)

1. GitHub'da **Actions** sekmesinden son başarılı *Android APK* çalışmasını aç ve `KentUstasi-apk` dosyasını indir
   (ya da aşağıdaki gibi kendin derle).
2. Zip içindeki `KentUstasi.apk` dosyasını telefona at ve dokunarak kur
   ("Bilinmeyen kaynaklardan yükleme" izni istenirse onayla).

Android 7.0 (API 24) ve üzeri desteklenir.

## Nasıl oynanır

| Hareket | İşlev |
|---|---|
| Tek parmakla sürükle | Haritayı kaydır |
| İki parmak | Yakınlaştır / uzaklaştır |
| Binaya dokun | Bilgi, yükselt, taşı, yık, onar |
| İnşa > bina seç > haritaya dokun | Yer seç; ✔ ile ya da binaya tekrar dokunarak onayla |
| Yol / Köprü / Yıkım / Ağaç | Tek parmakla çiz, iki parmakla kaydır |

Temel kurallar:

- Binalar, **belediyeye bağlı bir yola** bitişik olmalı (kırmızı yanıp sönen yol bağlı değildir).
- Konutlar elektrik ve su ister. Halk iş, gıda ve hizmet bekler; mutluluk arttıkça evler dolar.
- Sanayi ve kömür santrali kirletir: evlerden uzak tut.
- Sol üstteki görev kutusu ne yapman gerektiğini söyler; ödülü almak için dokun.
- Belediyeyi yükseltmek yeni çağ, daha fazla inşaat ekibi ve bölge hakkı açar.

## Derleme

Gereksinimler: JDK 17+, Android SDK (platform 35, build-tools 35.0.0).

```bash
./gradlew assembleRelease
# çıktı: app/build/outputs/apk/release/app-release.apk
```

Depodaki `app/debug.keystore` bilerek paylaşılan bir geliştirme imzasıdır: her derleme aynı imzayı
taşıdığı için yeni sürüm eskisinin üzerine kurulur ve kayıt silinmez. Play Store'a yüklemek için
`app/build.gradle` içindeki `signingConfigs` bölümünü kendi anahtarınla değiştir.

### Bilgisayarda denemek

Oyun saf HTML5/JavaScript olduğu için tarayıcıda da çalışır:
`app/src/main/assets/game/index.html` dosyasını Chrome'da aç (telefon görünümü için geliştirici araçlarını kullan).

### Testler

```bash
node tools/smoke.js          # oyun mantığı doğrulaması (CI'da da çalışır)
node tools/balance.js 20     # bot ile 20 oyun saati denge simülasyonu
```

## Proje yapısı

```
app/src/main/
├── java/.../MainActivity.java    Tam ekran WebView, dosyaya kayıt köprüsü, geri tuşu, titreşim
├── res/                          Uygulama simgesi (vektör), tema, metinler
└── assets/game/                  Oyunun kendisi
    ├── index.html, css/style.css
    └── js/
        ├── util.js     Rastgele sayı, gürültü, sayı biçimleme, olay sistemi
        ├── data.js     Binalar, kaynaklar, teknolojiler, görevler, başarımlar, olaylar
        ├── world.js    Harita üretimi
        ├── sim.js      Simülasyon: ekonomi, nüfus, mutluluk, inşaat, ticaret, kayıt
        ├── art.js      İzometrik çizim kiti ve prosedürel bina sprite'ları
        ├── render.js   Kamera, zemin önbelleği, derinlik sıralama, araçlar, gece/gündüz
        ├── input.js    Dokunmatik kontroller ve yerleştirme modları
        ├── ui.js       HUD, inşa menüsü, paneller, pencereler
        ├── audio.js    Sentezlenmiş ses efektleri
        ├── save.js     Kayıt (uygulama dosyası + localStorage yedeği)
        └── main.js     Açılış ve ana döngü
tools/                            Tarayıcısız test ve denge araçları (Node.js)
```

`util.js`, `data.js`, `world.js` ve `sim.js` tarayıcıya bağımlı değildir; bu sayede oyun mantığı
Node.js ile test edilebilir.
