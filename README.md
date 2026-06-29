# ⚽ Futbol 3D — Hareketle Penaltı

Kameranın karşısına geçip **vücudunu eğerek** köşe seçtiğin, **bacağını savurarak**
şut çektiğin web tabanlı 3D penaltı oyunu. Tarayıcıda çalışır; daha sonra Capacitor
ile App Store / Google Play'e paketlenebilir.

## 🎮 Nasıl Oynanır

1. **BAŞLA**'ya bas, kamera iznini ver.
2. **Vücudunu sağa/sola eğ** → kalede köşe seç (SOL / ORTA / SAĞ).
3. **Bacağını hızla öne/yukarı savur** → top o yöne fırlar. Ne kadar hızlı, o kadar sert.
4. Kaleci rastgele dalış yapar; bazen yönünü doğru tahmin eder.
5. 5 şut sonunda skorun gösterilir.

**Kamerasız test / yedek kontrol:** `←` `→` ile yön, `BOŞLUK` ile şut.

## 🧱 Teknoloji

- **Vite + TypeScript** — proje iskeleti ve build
- **Three.js** — 3D sahne (stadyum, kale, kaleci, top), yumuşak gölgeler
- **@mediapipe/tasks-vision** (PoseLandmarker) — kameradan 33 noktalı vücut takibi
- **@dimforge/rapier3d-compat** — top fiziği (yerçekimi, sekme, çarpışma)
- **Capacitor** — mobil mağaza paketlemesi (kurulum sonradan)

## 📁 Proje Yapısı

```
src/
├── main.ts                  # giriş noktası, her şeyi başlatır
├── scene/
│   ├── Stadium.ts           # çim, çizgiler, ışıklar, tribün
│   ├── Goal.ts              # kale (7.32×2.44m) + file
│   ├── Keeper.ts            # kaleci modeli + dalış animasyonu
│   └── Ball.ts              # top mesh + Rapier fizik gövdesi
├── tracking/
│   ├── PoseTracker.ts       # MediaPipe kurulumu, kamera, landmark akışı
│   └── GestureDetector.ts   # eğilme (yön) + bacak şutu (tetikleme)
├── game/
│   ├── GameState.ts         # skor, şut sayısı, faz makinesi
│   └── GameLoop.ts          # ana döngü, fizik, şut çözümü, render
└── ui/
    ├── HUD.ts               # skor, güç çubuğu, başlat/bitir ekranları
    └── Skeleton.ts          # iskelet çizimi (geri bildirim)
```

### Ekran katmanları (alttan üste)

1. Canlı kamera (aynalı, %35 opaklık)
2. Three.js 3D sahne (şeffaf arka plan)
3. İskelet çizimi (yeşil, aynalı)
4. HUD (skor, güç, durum, ekranlar)

## 🚀 Çalıştırma

```bash
npm install
npm run dev            # http://localhost:5173
```

Telefonda test (aynı WiFi):

```bash
npm run dev -- --host  # telefondan bilgisayarının IP'sine git
```

> Kamera için güvenli bağlam gerekir: `localhost` çalışır; ağdaki gerçek
> cihazlarda HTTPS gerekebilir.

Üretim derlemesi:

```bash
npm run build          # tip kontrolü + vite build -> dist/
npm run preview
```

## 🎚️ Kalibrasyon (ayarlanabilir eşikler)

`src/tracking/GestureDetector.ts` içinde:

| Değişken | Anlamı | Varsayılan |
|---|---|---|
| `leftThreshold` / `rightThreshold` | sol/sağ köşe eğilme sınırı | `0.42` / `0.58` |
| `kickVelThreshold` | bacak yukarı hız şut eşiği | `0.045` |
| `cooldownFrames` | çift tetiklemeyi önleme | `30` |

Kaleci zorluğu: `src/game/GameLoop.ts` → `chooseDive()` içindeki `guessChance` (0.45).

## 📱 Android paketleme (Capacitor — hazır)

Android platformu **kuruldu** (`capacitor.config.ts`, `android/` projesi,
kamera izinleri). Web bundle'ı `cap sync` ile üretildiği için repoda izlenmez.

Android Studio + JDK 17 kurulu bir makinede:

```bash
npm install
npm run cap:sync          # web'i derle + native'e kopyala
npm run android:open      # derle, senkronla ve Android Studio'da aç
```

Hazır npm scriptleri:

| Script | İşlevi |
|---|---|
| `npm run cap:sync` | `npm run build` + `cap sync` (web bundle'ı native'e kopyalar) |
| `npm run android:add` | `cap add android` (platform yoksa yeniden oluşturur) |
| `npm run android:open` | build + sync + Android Studio'da açar |

Kamera (vücut takibi) için yapılandırılanlar:
- `AndroidManifest.xml` → `CAMERA` izni + kamera özellikleri
- `MainActivity.java` → açılışta çalışma anı kamera izni isteği

> **iOS** için: `npm i @capacitor/ios && npx cap add ios`, ardından
> `Info.plist` içine `NSCameraUsageDescription` ekleyin.
